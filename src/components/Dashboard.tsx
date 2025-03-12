import React, { useState, useEffect, useRef } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TradingService, TradingPatternType as ServiceTradingPatternType } from '../services/tradingService';
import { TradingStatus, Account as TypesAccount, Transaction } from '../types';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

// Use the service's TradingPatternType
type TradingPatternType = ServiceTradingPatternType;

interface TokenTransaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  timestamp: number;
  type: string;
  isWhale: boolean;
}

interface WalletSummary {
  type: 'whale' | 'retail';
  count: number;
  totalBalance: number;
  percentageOfSupply: number;
}

interface TradingDataPoint {
  timestamp: number;
  price: number;
  volume: number;
}

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  mint?: string;
}

interface Account extends TypesAccount {
  solBalance: number;
}

// Define tab type
type TabType = 'overview' | 'accounts' | 'transactions' | 'wallets' | 'settings' | 'admin';

// Update TaskStatus interface
interface TaskStatus {
  id: string;
  status: 'pending' | 'loading' | 'success' | 'failure' | 'running' | 'error';
}

// TradingView widget component
const TradingViewWidget = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget-container';
      widgetContainer.setAttribute('role', 'region');
      widgetContainer.setAttribute('aria-label', 'Trading Chart');
      widgetContainer.style.height = '100%';
      widgetContainer.style.width = '100%';

      const widget = document.createElement('div');
      widget.className = 'tradingview-widget-container__widget';
      widget.style.height = 'calc(100% - 32px)';
      widget.style.width = '100%';

      const copyright = document.createElement('div');
      copyright.className = 'tradingview-widget-copyright';
      copyright.innerHTML = '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>';

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: "BINANCE:DOGEUSD",
        interval: "1",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        allow_symbol_change: true,
        calendar: false,
        support_host: "https://www.tradingview.com",
        hide_volume: true,
        backgroundColor: "rgba(19, 23, 34, 1)",
        gridColor: "rgba(42, 46, 57, 0.3)",
        container_id: "tradingview_chart"
      });

      widgetContainer.appendChild(widget);
      widgetContainer.appendChild(copyright);
      widgetContainer.appendChild(script);
      containerRef.current.appendChild(widgetContainer);
    }
  }, []);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
};

// Define DashboardProps interface
interface DashboardProps {
  connection: Connection;
  tokenMint: string;
}

// Trading pattern interface
interface TradingPattern {
  id: TradingPatternType;
  name: string;
  description: string;
  defaultDuration: number;
  defaultIntensity: number;
}

// Format SOL balance function
const formatSolBalance = (lamports: number) => {
  const sol = lamports / 1_000_000_000;
  return sol.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 9 });
};

const Dashboard: React.FC<DashboardProps> = ({ connection, tokenMint }) => {
  // State variables
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TokenTransaction[]>([]);
  const [walletSummary, setWalletSummary] = useState<WalletSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [tradingStatus, setTradingStatus] = useState<TradingStatus>({
    isRunning: false,
    currentPattern: null,
    remainingTime: null,
    startTime: null,
    totalDuration: null
  });
  const [currentPattern, setCurrentPattern] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [availablePatterns, setAvailablePatterns] = useState<TradingPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<TradingPatternType | ''>('');
  const [patternDuration, setPatternDuration] = useState<number>(60);
  const [patternIntensity, setPatternIntensity] = useState<number>(5);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [adminOutput, setAdminOutput] = useState<string[]>([]);
  const [isCommandRunning, setIsCommandRunning] = useState<boolean>(false);
  const [tradingData, setTradingData] = useState<TradingDataPoint[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([
    { id: 'create-accounts', status: 'pending' },
    { id: 'test-accounts', status: 'pending' },
    { id: 'create-source-wallet', status: 'pending' },
    { id: 'distribute-sol', status: 'pending' },
    { id: 'create-token', status: 'pending' },
    { id: 'run-trading', status: 'pending' }
  ]);
  const adminOutputRef = useRef<HTMLDivElement>(null);

  // Create trading service
  const tradingService = new TradingService(connection, tokenMint);
  
  // Add a function to update the admin terminal output
  const addToTerminal = (text: string) => {
    if (text.includes('\n')) {
      const lines = text.split('\n');
      setAdminOutput(prev => [...prev, ...lines.filter(line => line.trim() !== '')]);
    } else {
      setAdminOutput(prev => [...prev, text]);
    }
    
    // Auto-scroll to the bottom when new content is added
    setTimeout(() => {
      if (adminOutputRef.current) {
        adminOutputRef.current.scrollTop = adminOutputRef.current.scrollHeight;
      }
    }, 100);
  };

  // Fetch data from API
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch accounts
      const accountsResponse = await fetch('/api/accounts');
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setAccounts(accountsData);
      }
      
      // Fetch token info
      try {
        const response = await fetch('/token-info.json');
        if (response.ok) {
          const tokenData = await response.json();
          if (tokenData && tokenData.mint) {
            setTokenInfo({
              name: tokenData.name || 'Unknown',
              symbol: tokenData.symbol || 'UNK',
              decimals: tokenData.decimals || 9,
              totalSupply: tokenData.totalSupply || 0,
              mint: tokenData.mint
            });
          }
        }
      } catch (error) {
        console.error('Error fetching token info:', error);
      }
      
      // Fetch trading status
      try {
        const statusResponse = await fetch('/api/trading/status');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData) {
            setCurrentPattern(statusData.currentPattern || null);
            setRemainingTime(statusData.remainingTime || null);
            setTotalDuration(statusData.totalDuration || null);
            
            setTradingStatus({
              isRunning: statusData.isActive || false,
              currentPattern: statusData.currentPattern || null,
              remainingTime: statusData.remainingTime || null,
              startTime: statusData.startTime || null,
              totalDuration: statusData.totalDuration || null
            });
            
            if (statusData.timeRemaining && statusData.totalDuration) {
              const elapsed = statusData.totalDuration - statusData.timeRemaining;
              const percentage = (elapsed / statusData.totalDuration) * 100;
              setProgressPercentage(Math.min(Math.max(percentage, 0), 100));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching trading status:', error);
      }
      
      // Fetch transactions
      try {
        const txResponse = await fetch('/api/transactions?limit=50');
        if (txResponse.ok) {
          const txData = await txResponse.json();
          setRecentTransactions(txData);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
      
      // Mock wallet summary data
      const mockWalletSummary: WalletSummary[] = [
        {
          type: 'whale',
          count: accounts.filter(a => a.type === 'WHALE').length,
          totalBalance: accounts.filter(a => a.type === 'WHALE').reduce((sum, a) => sum + a.balance, 0),
          percentageOfSupply: 60
        },
        {
          type: 'retail',
          count: accounts.filter(a => a.type === 'RETAIL').length,
          totalBalance: accounts.filter(a => a.type === 'RETAIL').reduce((sum, a) => sum + a.balance, 0),
          percentageOfSupply: 40
        }
      ];
      setWalletSummary(mockWalletSummary);
      
      // Mock trading data if the endpoint doesn't exist yet
      const mockTradingData: TradingDataPoint[] = Array(24).fill(null).map((_, i) => ({
        timestamp: Date.now() - (24 - i) * 3600 * 1000,
        price: 1 + Math.random() * 0.5,
        volume: 10000 + Math.random() * 50000
      }));
      setTradingData(mockTradingData);
      
      // Update last refreshed timestamp
      setLastRefreshed(new Date());
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Use fetchData in useEffect
  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh interval (every 30 seconds)
    const refreshInterval = setInterval(fetchData, 30000);
    
    // Clean up on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Format timestamp as date string
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // Format address for display (truncate)
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Format remaining time
  const formatRemainingTime = (ms: number | null) => {
    if (ms === null) return '--:--:--';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  
  // Handle pattern change
  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patternId = e.target.value as TradingPatternType | '';
    setSelectedPattern(patternId);
    
    if (patternId) {
      const pattern = availablePatterns.find(p => p.id === patternId);
      if (pattern) {
        setPatternDuration(pattern.defaultDuration);
        setPatternIntensity(pattern.defaultIntensity);
      }
    }
  };
  
  // Start trading
  const handleStartTrading = async () => {
    if (!selectedPattern) return;
    
    try {
      await tradingService.startTrading({
        type: selectedPattern,
        duration: patternDuration,
        intensity: patternIntensity
      });
      
      addToTerminal(`Started ${selectedPattern} trading pattern (${patternDuration} minutes, intensity ${patternIntensity})`);
      
      // Refresh trading status
      const status = await tradingService.getTradingStatus();
      setCurrentPattern(status.currentPattern as string | null);
      setRemainingTime(status.remainingTime);
      setStartTime(status.startTime);
      setTotalDuration(status.totalDuration);
      
      // Switch to overview tab
      setActiveTab('overview');
    } catch (error) {
      console.error('Error starting trading:', error);
      addToTerminal(`Error starting trading: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Stop trading
  const handleStopTrading = async () => {
    try {
      await tradingService.stopTrading();
      
      addToTerminal('Stopped trading pattern');
      
      // Refresh trading status
      const status = await tradingService.getTradingStatus();
      setCurrentPattern(status.currentPattern as string | null);
      setRemainingTime(status.remainingTime);
      setStartTime(status.startTime);
      setTotalDuration(status.totalDuration);
    } catch (error) {
      console.error('Error stopping trading:', error);
      addToTerminal(`Error stopping trading: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Helper function to update task status
  const updateTaskStatus = (taskId: string, status: 'pending' | 'loading' | 'success' | 'failure', message?: string) => {
    setTaskStatuses(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, status, message } 
          : task
      )
    );
  };

  // Update the renderTaskStatusIcon function to handle the new statuses
  const renderTaskStatusIcon = (status: TaskStatus['status']) => {
    switch (status) {
      case 'success':
        return <span className="task-status success">✅</span>;
      case 'error':
      case 'failure':
        return <span className="task-status error">❌</span>;
      case 'running':
      case 'loading':
        return <span className="task-status running">⏳</span>;
      case 'pending':
      default:
        return <span className="task-status pending">⬜</span>;
    }
  };

  // Modified executeCommand to use task status indicators
  const executeCommand = async (command: string) => {
    setIsCommandRunning(true);
    addToTerminal(`> Executing command: ${command}...`);
    
    const updateTaskStatus = (taskId: string, status: TaskStatus['status']) => {
      setTaskStatuses(prev => 
        prev.map(task => task.id === taskId ? { ...task, status } : task)
      );
    };
    
    try {
      // Set the task to running
      updateTaskStatus(command, 'running');
      
      let apiEndpoint = '';
      let apiBody = {};
      
      switch (command) {
        case 'create-accounts':
          apiEndpoint = '/api/create-accounts';
          break;
        case 'test-accounts':
          apiEndpoint = '/api/test-accounts';
          break;
        case 'create-source-wallet':
          apiEndpoint = '/api/create-source-wallet';
          break;
        case 'distribute-sol':
          apiEndpoint = '/api/distribute-sol';
          apiBody = { amount: 0.05 }; // Default SOL amount
          break;
        case 'create-token':
          apiEndpoint = '/api/create-token';
          break;
        case 'run-trading':
          apiEndpoint = '/api/run-patterns';
          break;
        case 'status':
          apiEndpoint = '/api/status';
          break;
        default:
          throw new Error(`Unknown command: ${command}`);
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiBody)
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      // Add the output to the terminal
      if (result.output) {
        addToTerminal(result.output);
      } else {
        addToTerminal(result.message || JSON.stringify(result));
      }
      
      // Update task status
      if (result.success) {
        updateTaskStatus(command, 'success');
      } else {
        updateTaskStatus(command, 'error');
      }
      
      // If the command is 'create-token', poll for token creation status
      if (command === 'create-token' && result.success) {
        addToTerminal('\nWaiting for token creation to complete...');
        
        // Start polling for token status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch('/api/token-status');
            if (!statusResponse.ok) {
              throw new Error(`Token status check failed with status ${statusResponse.status}`);
            }
            
            const statusResult = await statusResponse.json();
            
            if (statusResult.isCreated) {
              // Token creation complete
              clearInterval(pollInterval);
              const { name, symbol, mint, decimals, totalSupply } = statusResult.tokenInfo;
              addToTerminal(`\n✅ Token creation complete!`);
              addToTerminal(`Token: ${name} (${symbol})`);
              addToTerminal(`Mint: ${mint}`);
              addToTerminal(`Decimals: ${decimals}`);
              addToTerminal(`Total Supply: ${totalSupply}`);
              
              // Refresh accounts and token info
              fetchData();
            }
          } catch (pollError) {
            console.error('Error polling for token status:', pollError);
          }
        }, 5000); // Poll every 5 seconds
        
        // Stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          addToTerminal('\n⚠️ Token status polling timed out. Please check the console for status.');
        }, 5 * 60 * 1000);
      }
      
      // Refresh data after certain commands
      if (['create-accounts', 'create-token', 'distribute-sol'].includes(command)) {
        fetchData();
      }
      
      return result;
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      addToTerminal(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      updateTaskStatus(command, 'error');
      return { success: false, message: String(error) };
    } finally {
      setIsCommandRunning(false);
    }
  };

  // Clear terminal
  const clearTerminal = () => {
    setAdminOutput([
      "Terminal cleared",
      "-------------------------------------------"
    ]);
  };
  
  // Prepare chart data
  const priceChartData = {
    labels: tradingData.map((d: TradingDataPoint) => formatTimestamp(d.timestamp)),
    datasets: [
      {
        label: 'Price',
        data: tradingData.map((d: TradingDataPoint) => d.price),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };
  
  const volumeChartData = {
    labels: tradingData.map((d: TradingDataPoint) => formatTimestamp(d.timestamp)),
    datasets: [
      {
        label: 'Volume',
        data: tradingData.map((d: TradingDataPoint) => d.volume),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderWidth: 1
      }
    ]
  };
  
  const walletDistributionData = {
    labels: walletSummary.map(w => w.type === 'whale' ? 'Whale Wallets' : 'Retail Wallets'),
    datasets: [
      {
        data: walletSummary.map(w => w.percentageOfSupply),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)'
        ],
        borderWidth: 1
      }
    ]
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchData();
  };

  // Update the renderAccountsTab function to show full address on hover
  const renderAccountsTab = () => {
    const whaleCount = accounts.filter(a => a.type === 'WHALE').length;
    const retailCount = accounts.filter(a => a.type === 'RETAIL').length;
    
    return (
      <div className="accounts-tab">
        <div className="accounts-header">
          <h2>Token Accounts</h2>
          <div className="refresh-controls">
            <button onClick={fetchData} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            {lastRefreshed && (
              <span className="last-refreshed">
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {isLoading ? (
          <div className="loading">Loading account data...</div>
        ) : (
          <>
            <div className="token-info-card">
              <h3>Token Information</h3>
              {tokenInfo ? (
                <table>
                  <tbody>
                    <tr>
                      <td>Name:</td>
                      <td>{tokenInfo.name || 'Unknown'}</td>
                    </tr>
                    <tr>
                      <td>Symbol:</td>
                      <td>{tokenInfo.symbol || 'Unknown'}</td>
                    </tr>
                    <tr>
                      <td>Mint:</td>
                      <td className="address-container">
                        <span className="truncated-address">{tokenInfo.mint ? `${tokenInfo.mint.slice(0, 4)}...${tokenInfo.mint.slice(-4)}` : 'Not created yet'}</span>
                        {tokenInfo.mint && (
                          <span className="full-address">{tokenInfo.mint}</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Decimals:</td>
                      <td>{tokenInfo.decimals || '0'}</td>
                    </tr>
                    <tr>
                      <td>Total Supply:</td>
                      <td>{tokenInfo.totalSupply?.toLocaleString() || '0'}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p>No token has been created yet. Use the Admin tab to create a token.</p>
              )}
            </div>
            
            <div className="accounts-list">
              <h3>Wallet Distribution ({accounts.length} accounts)</h3>
              <div className="accounts-summary">
                <div className="summary-item">
                  <span className="label">Whale Accounts:</span>
                  <span className="value">{whaleCount}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Retail Accounts:</span>
                  <span className="value">{retailCount}</span>
                </div>
              </div>
              
              {accounts.length > 0 ? (
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Account</th>
                      <th>SOL Balance</th>
                      {tokenInfo && <th>Token Balance</th>}
                      {tokenInfo && <th>% of Supply</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account, index) => {
                      // Calculate percentage of total supply if token info exists
                      const percentage = tokenInfo && tokenInfo.totalSupply && account.balance 
                        ? ((account.balance / tokenInfo.totalSupply) * 100).toFixed(2) 
                        : '0.00';
                          
                      return (
                        <tr key={index} className={account.type}>
                          <td>
                            <span className={`account-type ${account.type}`}>
                              {account.type === 'WHALE' ? '🐋 Whale' : '👤 Retail'}
                            </span>
                          </td>
                          <td className="address-container">
                            <span className="truncated-address">{account.publicKey.slice(0, 4)}...{account.publicKey.slice(-4)}</span>
                            <span className="full-address">{account.publicKey}</span>
                            <button 
                              className="copy-button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(account.publicKey);
                                alert('Address copied to clipboard!');
                              }}
                              title="Copy address to clipboard"
                            >
                              📋
                            </button>
                          </td>
                          <td className="balance">
                            {formatSolBalance(account.solBalance)} SOL
                          </td>
                          {tokenInfo && (
                            <td className="balance">
                              {account.balance?.toLocaleString() || '0'} {tokenInfo?.symbol || ''}
                            </td>
                          )}
                          {tokenInfo && <td className="percentage">{percentage}%</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p>No accounts available. Use the Admin tab to create accounts.</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // Add tabs for transactions, wallets, and settings
  const renderTransactionsTab = () => {
    return (
      <div className="transactions-tab">
        <h2>Recent Transactions</h2>
        
        {recentTransactions.length > 0 ? (
          <div className="table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx, index) => (
                  <tr key={index} className={tx.isWhale ? 'whale-tx' : ''}>
                    <td>{formatTimestamp(tx.timestamp)}</td>
                    <td className="address-container">
                      <span className="truncated-address">{formatAddress(tx.sender)}</span>
                      <span className="full-address">{tx.sender}</span>
                    </td>
                    <td className="address-container">
                      <span className="truncated-address">{formatAddress(tx.receiver)}</span>
                      <span className="full-address">{tx.receiver}</span>
                    </td>
                    <td className="amount">{tx.amount.toLocaleString()}</td>
                    <td className="type">{tx.isWhale ? '🐋 Whale' : '👤 Retail'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No transactions available yet.</p>
        )}
      </div>
    );
  };

  const renderWalletsTab = () => {
    // Create data for the wallet distribution chart
    const walletData = {
      labels: walletSummary.map(w => w.type === 'whale' ? 'Whale Wallets' : 'Retail Wallets'),
      datasets: [{
        data: walletSummary.map(w => w.percentageOfSupply),
        backgroundColor: [
          'rgba(252, 163, 17, 0.7)',  // Whale color (accent)
          'rgba(33, 150, 243, 0.7)'   // Retail color (info)
        ],
        borderColor: [
          'rgba(252, 163, 17, 1)',
          'rgba(33, 150, 243, 1)'
        ],
        borderWidth: 1
      }]
    };
    
    return (
      <div className="wallets-tab">
        <h2>Wallet Distribution</h2>
        
        {walletSummary.length > 0 ? (
          <>
            <div className="wallet-chart-container">
              <Doughnut 
                data={walletData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        color: '#FFFFFF'
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.label}: ${context.raw}% of supply`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
            
            <div className="wallet-stats">
              {walletSummary.map((wallet, index) => (
                <div key={index} className={`wallet-stat-card ${wallet.type}`}>
                  <h3>{wallet.type === 'whale' ? '🐋 Whale Wallets' : '👤 Retail Wallets'}</h3>
                  <div className="stat-row">
                    <span className="label">Number of Wallets:</span>
                    <span className="value">{wallet.count}</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">Total Balance:</span>
                    <span className="value">{wallet.totalBalance.toLocaleString()}</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">% of Supply:</span>
                    <span className="value">{wallet.percentageOfSupply.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="no-data">No wallet data available yet.</p>
        )}
      </div>
    );
  };

  const renderSettingsTab = () => {
    return (
      <div className="settings-tab">
        <h2>Trading Pattern Settings</h2>
        
        <div className="settings-form">
          <div className="form-group">
            <label htmlFor="pattern-select">Select Pattern:</label>
            <select 
              id="pattern-select" 
              value={selectedPattern} 
              onChange={handlePatternChange}
              disabled={tradingStatus.isRunning}
            >
              <option value="">Select a pattern</option>
              {availablePatterns.map(pattern => (
                <option key={pattern.id} value={pattern.id}>{pattern.name}</option>
              ))}
            </select>
          </div>
          
          {selectedPattern && (
            <>
              <div className="form-group">
                <label htmlFor="pattern-description">Description:</label>
                <p id="pattern-description" className="pattern-description">
                  {availablePatterns.find(p => p.id === selectedPattern)?.description || ''}
                </p>
              </div>
              
              <div className="form-group">
                <label htmlFor="duration-input">Duration (minutes):</label>
                <input 
                  id="duration-input" 
                  type="number" 
                  min="1" 
                  max="1440" 
                  value={patternDuration} 
                  onChange={(e) => setPatternDuration(parseInt(e.target.value))}
                  disabled={tradingStatus.isRunning}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="intensity-input">Intensity (1-10):</label>
                <div className="range-container">
                  <input 
                    id="intensity-input" 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={patternIntensity} 
                    onChange={(e) => setPatternIntensity(parseInt(e.target.value))}
                    disabled={tradingStatus.isRunning}
                  />
                  <span className="range-value">{patternIntensity}</span>
                </div>
              </div>
            </>
          )}
          
          <div className="form-actions">
            {!tradingStatus.isRunning ? (
              <button 
                className="start-button" 
                onClick={handleStartTrading}
                disabled={!selectedPattern}
              >
                Start Trading
              </button>
            ) : (
              <button 
                className="stop-button" 
                onClick={handleStopTrading}
              >
                Stop Trading
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAdminTab = () => {
    return (
      <div className="admin-tab">
        <h3>Admin Console</h3>
        
        <div className="admin-panel">
          <div className="admin-controls">
            <div className="control-section">
              <h4>Setup</h4>
              <div className="button-group">
                <button 
                  className="admin-button" 
                  onClick={() => executeCommand('create-accounts')}
                  disabled={isCommandRunning}
                >
                  Create Accounts
                  {renderTaskStatusIcon(taskStatuses.find(t => t.id === 'create-accounts')?.status || 'pending')}
                </button>
                <button 
                  className="admin-button" 
                  onClick={() => executeCommand('test-accounts')}
                  disabled={isCommandRunning}
                >
                  Test Accounts
                  {renderTaskStatusIcon(taskStatuses.find(t => t.id === 'test-accounts')?.status || 'pending')}
                </button>
                <button 
                  className="admin-button" 
                  onClick={() => executeCommand('create-source-wallet')}
                  disabled={isCommandRunning}
                >
                  Create Source Wallet
                  {renderTaskStatusIcon(taskStatuses.find(t => t.id === 'create-source-wallet')?.status || 'pending')}
                </button>
              </div>
            </div>
            
            <div className="control-section">
              <h4>Token Operations</h4>
              <div className="button-group">
                <button 
                  className="admin-button" 
                  onClick={() => executeCommand('distribute-sol')}
                  disabled={isCommandRunning}
                >
                  Distribute SOL
                  {renderTaskStatusIcon(taskStatuses.find(t => t.id === 'distribute-sol')?.status || 'pending')}
                </button>
                <button 
                  className="admin-button" 
                  onClick={() => executeCommand('create-token')}
                  disabled={isCommandRunning}
                >
                  Create Token
                  {renderTaskStatusIcon(taskStatuses.find(t => t.id === 'create-token')?.status || 'pending')}
                </button>
              </div>
            </div>
            
            <div className="control-section">
              <h4>Trading</h4>
              <div className="button-group">
                <button 
                  className="admin-button" 
                  onClick={() => executeCommand('run-trading')}
                  disabled={isCommandRunning}
                >
                  Run Trading
                  {renderTaskStatusIcon(taskStatuses.find(t => t.id === 'run-trading')?.status || 'pending')}
                </button>
                <button 
                  className="admin-button" 
                  onClick={() => executeCommand('status')}
                  disabled={isCommandRunning}
                >
                  Check Status
                </button>
              </div>
            </div>
          </div>
          
          <div className="admin-terminal">
            <div className="terminal-header">
              <h4>Terminal Output</h4>
              <button 
                className="clear-button" 
                onClick={clearTerminal}
                disabled={isCommandRunning}
              >
                Clear
              </button>
            </div>
            <div className="terminal-output" ref={adminOutputRef}>
              {adminOutput.map((line, index) => {
                let className = '';
                if (line.startsWith('>')) className = 'command-line';
                else if (line.startsWith('✅')) className = 'success-line';
                else if (line.startsWith('❌')) className = 'error-line';
                else if (line.startsWith('⚠️')) className = 'warning-line';
                
                return (
                  <div key={index} className={className}>
                    {line}
                  </div>
                );
              })}
              {isCommandRunning && <div className="terminal-cursor">_</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Return the dashboard JSX
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="token-info">
          <h1>{tokenInfo?.name || 'Solana Token Simulator'} {tokenInfo?.symbol ? `(${tokenInfo.symbol})` : ''}</h1>
          {tokenInfo && <p>Total Supply: {tokenInfo.totalSupply.toLocaleString()} | Decimals: {tokenInfo.decimals}</p>}
        </div>
        
        {currentPattern && remainingTime && (
          <div className="trading-status">
            <p>Running: <strong>{currentPattern}</strong></p>
            <p>Remaining: {formatRemainingTime(remainingTime)}</p>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
        )}
      </div>
      
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'accounts' ? 'active' : ''} 
          onClick={() => setActiveTab('accounts')}
        >
          Accounts
        </button>
        <button 
          className={activeTab === 'transactions' ? 'active' : ''} 
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
        <button 
          className={activeTab === 'wallets' ? 'active' : ''} 
          onClick={() => setActiveTab('wallets')}
        >
          Wallets
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''} 
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button 
          className={activeTab === 'admin' ? 'active' : ''} 
          onClick={() => setActiveTab('admin')}
        >
          Admin
        </button>
      </div>
      
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {isLoading ? (
              <div className="loading">Loading dashboard data...</div>
            ) : (
              <>
                <div className="chart-container">
                  <h3>Real-Time Price Chart (DOGE/USD)</h3>
                  <TradingViewWidget />
                </div>
                
                <div className="stats-container">
                  <div className="stat-card">
                    <h3>Total Accounts</h3>
                    <p className="stat-value">{accounts.length}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Whale Accounts</h3>
                    <p className="stat-value">{accounts.filter(a => a.type === 'WHALE').length}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Transactions</h3>
                    <p className="stat-value">{recentTransactions.length}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {activeTab === 'accounts' && renderAccountsTab()}
        {activeTab === 'transactions' && renderTransactionsTab()}
        {activeTab === 'wallets' && renderWalletsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'admin' && renderAdminTab()}
      </div>
    </div>
  );
};

export default Dashboard;
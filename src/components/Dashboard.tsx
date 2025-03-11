import React, { useState, useEffect, useRef } from 'react';
import { Connection } from '@solana/web3.js';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TradingService, TradingPatternType, TradingDataPoint, TokenTransaction, WalletSummary } from '../services/tradingService';
import { Transaction, TradingStatus, WalletType } from '../types';
import { Account as TypesAccount } from '../types';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement);

// Trading View Widget Component
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

// Dashboard props
interface DashboardProps {
  connection: Connection;
  tokenMint: string;
}

// Trading pattern
interface TradingPattern {
  id: TradingPatternType;
  name: string;
  description: string;
  defaultDuration: number;
  defaultIntensity: number;
}

interface AccountDetails {
  publicKey: string;
  secretKey: string;
  balance: number;
  tokenBalance: number;
  isWhale: boolean;
  lastActivity: number;
  totalTransactions: number;
  profitLoss: number;
}

// Define the TokenInfo type
interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  mint?: string; // Add mint property
}

// Add this interface for balance info data
interface BalanceItem {
  publicKey: string;
  balance: number;
  type: string;
}

interface BalanceInfo {
  timestamp: number;
  totalDistributed: number;
  distributionPercentage: number;
  whalePercentage: number;
  balances: BalanceItem[];
}

interface Account {
  publicKey: string;
  type: 'WHALE' | 'RETAIL';
  balance: number;
  status: string;
}

// Add a new interface for task status tracking
interface TaskStatus {
  id: string;
  name: string;
  status: 'pending' | 'loading' | 'success' | 'failure';
  message?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ connection, tokenMint }) => {
  // State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tradingData, setTradingData] = useState<TradingDataPoint[]>([]);
  const [currentPattern, setCurrentPattern] = useState<TradingPatternType | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [availablePatterns, setAvailablePatterns] = useState<TradingPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<TradingPatternType | ''>('');
  const [patternDuration, setPatternDuration] = useState<number>(60); // minutes
  const [patternIntensity, setPatternIntensity] = useState<number>(5); // 1-10 scale
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TokenTransaction[]>([]);
  const [walletSummary, setWalletSummary] = useState<WalletSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'wallets' | 'settings' | 'admin' | 'accounts'>('overview');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [adminOutput, setAdminOutput] = useState<string[]>([
    "Welcome to Solana Trading Simulator Admin Console",
    "Use the buttons below to control the simulation",
    "-------------------------------------------"
  ]);
  const [isCommandRunning, setIsCommandRunning] = useState<boolean>(false);
  const adminOutputRef = useRef<HTMLDivElement>(null);
  const [accountDetails, setAccountDetails] = useState<AccountDetails[]>([]);
  const [accountsLoading, setAccountsLoading] = useState<boolean>(true);
  const [accounts, setAccounts] = useState<TypesAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tradingStatus, setTradingStatus] = useState<TradingStatus>({
    isRunning: false,
    currentPattern: null,
    remainingTime: null,
    startTime: null,
    totalDuration: null
  });
  const [adminCommand, setAdminCommand] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Add new state for task statuses
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([
    { id: 'create-accounts', name: 'Create Accounts', status: 'pending' },
    { id: 'test-accounts', name: 'Test Accounts', status: 'pending' },
    { id: 'create-source-wallet', name: 'Create Source Wallet', status: 'pending' },
    { id: 'distribute-sol', name: 'Distribute SOL', status: 'pending' },
    { id: 'create-token', name: 'Create Token', status: 'pending' },
    { id: 'run-trading', name: 'Run Trading', status: 'pending' }
  ]);
  
  // Create trading service
  const tradingService = new TradingService(connection, tokenMint);
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get available patterns
        const patterns = await tradingService.getAvailablePatterns();
        setAvailablePatterns(patterns);
        
        // Get trading data
        const data = await tradingService.getTradingData();
        setTradingData(data);
        
        // Get trading status
        const status = await tradingService.getTradingStatus();
        setCurrentPattern(status.currentPattern as TradingPatternType | null);
        setRemainingTime(status.remainingTime);
        setStartTime(status.startTime);
        setTotalDuration(status.totalDuration);
        
        // Calculate progress percentage
        if (status.remainingTime !== null && status.totalDuration !== null) {
          const elapsed = status.totalDuration - status.remainingTime;
          setProgressPercentage(Math.min(100, Math.max(0, (elapsed / status.totalDuration) * 100)));
        } else {
          setProgressPercentage(0);
        }
        
        // Get token info
        const info = await tradingService.getTokenInfo();
        setTokenInfo({
          name: info.name,
          symbol: info.symbol,
          decimals: info.decimals,
          totalSupply: info.totalSupply,
          mint: info.mint
        });
        
        // Get recent transactions
        const transactions = await tradingService.getRecentTransactions(10);
        setRecentTransactions(transactions);
        
        // Get wallet summary
        const wallets = await tradingService.getWalletSummary();
        setWalletSummary(wallets);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Set up interval to refresh data
    const intervalId = setInterval(() => {
      loadData();
    }, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [connection, tokenMint]);

  // Scroll to bottom of admin output when it changes
  useEffect(() => {
    if (adminOutputRef.current) {
      adminOutputRef.current.scrollTop = adminOutputRef.current.scrollHeight;
    }
  }, [adminOutput]);
  
  // Initial data load
  useEffect(() => {
    console.log("Dashboard: Initial data load");
    fetchAllData();
    
    // Set up auto-refresh interval (every 10 seconds)
    const interval = window.setInterval(() => {
      console.log("Dashboard: Auto-refreshing data");
      fetchAllData();
    }, 10000);
    
    setRefreshInterval(interval);
    
    // Clean up interval on component unmount
    return () => {
      if (refreshInterval) {
        window.clearInterval(refreshInterval);
      }
    };
  }, []);

  // Fetch data from API
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Dashboard: Fetching all data...");
      
      // Fetch accounts
      try {
        console.log("Dashboard: Fetching accounts...");
        const accountsData = await tradingService.getAllAccounts();
        console.log("Dashboard: Received", accountsData.length, "accounts");
        setAccounts(accountsData);
      } catch (accountsError) {
        console.error('Dashboard: Failed to fetch accounts:', accountsError);
        setAccounts([]);
      }
      
      // Fetch token info
      try {
        console.log("Dashboard: Fetching token info...");
        const info = await tradingService.getTokenInfo();
        console.log("Dashboard: Received token info:", info.name);
        setTokenInfo(info);
      } catch (tokenError) {
        console.error('Dashboard: Failed to fetch token info:', tokenError);
      }
      
      // Try to get balance info if available
      try {
        console.log("Dashboard: Fetching balance info...");
        const balanceData = await tradingService.getBalanceInfo();
        
        if (balanceData && balanceData.balances && balanceData.balances.length > 0) {
          console.log("Dashboard: Received balance info for", balanceData.balances.length, "accounts");
          
          // Update accounts with accurate balance data
          const balanceMap: Record<string, { balance: number; type: string }> = {};
          balanceData.balances.forEach((balanceItem: BalanceItem) => {
            balanceMap[balanceItem.publicKey] = {
              balance: balanceItem.balance,
              type: balanceItem.type
            };
          });
          
          // Update accounts with balance info
          setAccounts(prevAccounts => {
            // Only update if we have accounts
            if (prevAccounts.length === 0) return prevAccounts;
            
            return prevAccounts.map(account => ({
              ...account,
              balance: balanceMap[account.publicKey]?.balance || account.balance,
              type: (balanceMap[account.publicKey]?.type || account.type) as WalletType
            }));
          });
          
          console.log('Dashboard: Updated accounts with balance info');
        }
      } catch (balanceError) {
        console.log('Dashboard: Failed to fetch balance info, using API accounts data only');
      }
      
      // Fetch transactions
      try {
        const txData = await tradingService.getTransactions(10);
        setTransactions(txData);
      } catch (txError) {
        console.error('Failed to fetch transactions:', txError);
      }
      
      // Fetch trading status
      try {
        const statusData = await tradingService.getTradingStatus();
        setTradingStatus(statusData);
      } catch (statusError) {
        console.error('Failed to fetch trading status:', statusError);
      }
      
      setLastRefreshed(new Date());
      setIsLoading(false);
      console.log("Dashboard: Finished fetching all data");
    } catch (error) {
      console.error('Dashboard: Data refresh failed:', error);
      setError('Failed to refresh data. Please try again.');
      setIsLoading(false);
    }
  };
  
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
      
      // Refresh data
      const status = await tradingService.getTradingStatus();
      setCurrentPattern(status.currentPattern as TradingPatternType | null);
      setRemainingTime(status.remainingTime);
      setStartTime(status.startTime);
      setTotalDuration(status.totalDuration);
      
      // Switch to overview tab
      setActiveTab('overview');
    } catch (error) {
      console.error('Error starting trading:', error);
    }
  };
  
  // Stop trading
  const handleStopTrading = async () => {
    try {
      await tradingService.stopTrading();
      
      // Refresh data
      const status = await tradingService.getTradingStatus();
      setCurrentPattern(status.currentPattern as TradingPatternType | null);
      setRemainingTime(status.remainingTime);
      setStartTime(status.startTime);
      setTotalDuration(status.totalDuration);
    } catch (error) {
      console.error('Error stopping trading:', error);
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

  // Function to render task status icon
  const renderTaskStatusIcon = (status: 'pending' | 'loading' | 'success' | 'failure') => {
    switch (status) {
      case 'pending':
        return <span className="task-status task-pending">⚪</span>;
      case 'loading':
        return <span className="task-status task-loading">⏳</span>;
      case 'success':
        return <span className="task-status task-success">✅</span>;
      case 'failure':
        return <span className="task-status task-failure">❌</span>;
      default:
        return null;
    }
  };

  // Modified executeCommand to use task status indicators
  const executeCommand = async (command: string) => {
    if (isCommandRunning) return;
    
    setAdminOutput(prev => [...prev, `> ${command}`]);
    setIsCommandRunning(true);
    
    // Get base command (without arguments)
    const baseCommand = command.split(' ')[0];
    
    // Update task status to loading
    updateTaskStatus(baseCommand, 'loading');
    
    try {
      // Execute actual command by calling the API
      let endpoint = '';
      let body = {};
      
      if (command === 'create-accounts') {
        endpoint = '/api/create-accounts';
        setAdminOutput(prev => [...prev, `Creating 50 Solana accounts...`]);
      } else if (command === 'test-accounts') {
        endpoint = '/api/test-accounts';
        setAdminOutput(prev => [...prev, `Testing account access...`]);
      } else if (command === 'create-source-wallet') {
        endpoint = '/api/create-source-wallet';
        setAdminOutput(prev => [...prev, `Creating source wallet...`]);
      } else if (command.startsWith('distribute-sol')) {
        endpoint = '/api/distribute-sol';
        const amount = command.split(' ')[1]?.trim() || '0.05';
        body = { amount };
        setAdminOutput(prev => [...prev, `Distributing ${amount} SOL to all accounts...`]);
      } else if (command === 'create-token') {
        endpoint = '/api/create-token';
        setAdminOutput(prev => [...prev, `Creating and distributing new token...`]);
        setAdminOutput(prev => [...prev, `This process will run in the background and may take a few minutes.`]);
        setAdminOutput(prev => [...prev, `You can continue using the app while the token is being created.`]);
      } else if (command === 'run-trading') {
        endpoint = '/api/run-trading';
        setAdminOutput(prev => [...prev, `Starting all trading patterns in sequence...`]);
        setAdminOutput(prev => [...prev, `This will run all patterns one after another.`]);
        setAdminOutput(prev => [...prev, `You can monitor progress in the Overview tab.`]);
      } else if (command === 'stop-trading') {
        endpoint = '/api/stop-trading';
        setAdminOutput(prev => [...prev, `Stopping trading patterns...`]);
      } else if (command.startsWith('run-pattern')) {
        endpoint = '/api/run-pattern';
        const args = command.split(' ');
        const pattern = args[1]?.trim() || 'moving_average';
        const duration = parseInt(args[2]?.trim() || '10', 10);
        const intensity = parseInt(args[3]?.trim() || '5', 10);
        body = { pattern, duration, intensity };
        setAdminOutput(prev => [...prev, `Running ${pattern} pattern with duration ${duration} min and intensity ${intensity}...`]);
      } else {
        setAdminOutput(prev => [...prev, `Unknown command: ${command}`]);
        setIsCommandRunning(false);
        updateTaskStatus(baseCommand, 'failure', 'Unknown command');
        return;
      }
      
      // Call API endpoint
      setAdminOutput(prev => [...prev, `Executing command...`]);
      
      try {
        const response = await fetch(`http://localhost:3001${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          // Add command output to terminal
          if (result.output) {
            // Split output by newlines and add each line
            const outputLines = result.output.split('\n');
            for (const line of outputLines) {
              if (line.trim()) {
                setAdminOutput(prev => [...prev, line]);
              }
            }
          } else {
            setAdminOutput(prev => [...prev, result.message || 'Command completed successfully']);
          }
          
          // Mark task as success
          updateTaskStatus(baseCommand, 'success');
          
          // Display success message
          setAdminOutput(prev => [...prev, `✅ ${command} command processed successfully!`]);
          
          // For token creation, set up a polling mechanism to check for token-info.json
          if (command === 'create-token') {
            setAdminOutput(prev => [...prev, `Waiting for token creation to complete...`]);
            
            // Start polling for token info
            let tokenInfoFound = false;
            const checkTokenInterval = setInterval(async () => {
              try {
                const response = await fetch('/token-info.json');
                if (response.ok) {
                  clearInterval(checkTokenInterval);
                  const tokenInfoData = await response.json();
                  // Fixed: Ensure tokenInfo is properly defined before using it
                  if (tokenInfoData && tokenInfoData.mint) {
                    setTokenInfo({
                      name: tokenInfoData.name || 'Unknown',
                      symbol: tokenInfoData.symbol || 'UNK',
                      decimals: tokenInfoData.decimals || 9,
                      totalSupply: tokenInfoData.totalSupply || 0,
                      mint: tokenInfoData.mint
                    });
                    tokenInfoFound = true;
                    setAdminOutput(prev => [...prev, `✅ Token created and distributed successfully!`]);
                    updateTaskStatus('create-token', 'success', 'Token created successfully');
                    await fetchAllData();
                  }
                }
              } catch (error) {
                // Continue polling
              }
            }, 5000);
            
            // Stop polling after 5 minutes
            setTimeout(() => {
              clearInterval(checkTokenInterval);
              if (!tokenInfoFound) {
                setAdminOutput(prev => [...prev, `⚠️ Token creation taking longer than expected. Check backend logs for details.`]);
                updateTaskStatus('create-token', 'failure', 'Timeout waiting for token');
              }
            }, 5 * 60 * 1000);
          }
          
          // Refresh data after certain commands
          if (['create-accounts', 'distribute-sol', 'test-accounts'].includes(command) || 
              command.startsWith('create-accounts') || 
              command.startsWith('distribute-sol')) {
            setAdminOutput(prev => [...prev, `Refreshing data...`]);
            await fetchAllData();
            setAdminOutput(prev => [...prev, `Data refreshed successfully!`]);
          }
        } else {
          updateTaskStatus(baseCommand, 'failure', result.message || 'Unknown error');
          setAdminOutput(prev => [...prev, `❌ Error: ${result.message || 'Unknown error'}`]);
        }
      } catch (error) {
        console.error('API call error:', error);
        updateTaskStatus(baseCommand, 'failure', error instanceof Error ? error.message : 'Unknown error');
        setAdminOutput(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
    } catch (error) {
      console.error('Command execution error:', error);
      updateTaskStatus(baseCommand, 'failure', error instanceof Error ? error.message : 'Unknown error');
      setAdminOutput(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
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
    labels: tradingData.map(d => formatTimestamp(d.timestamp)),
    datasets: [
      {
        label: 'Price',
        data: tradingData.map(d => d.price),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };
  
  const volumeChartData = {
    labels: tradingData.map(d => formatTimestamp(d.timestamp)),
    datasets: [
      {
        label: 'Volume',
        data: tradingData.map(d => d.volume),
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
    fetchAllData();
  };

  // Add this function to render the accounts tab content
  const renderAccountsTab = () => {
    const whaleCount = accounts.filter(a => a.type === 'WHALE').length;
    const retailCount = accounts.filter(a => a.type === 'RETAIL').length;
    
    // Calculate total token distribution
    const totalTokens = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    
    return (
      <div className="accounts-tab">
        <div className="accounts-header">
          <h2>Token Accounts</h2>
          <div className="refresh-controls">
            <button onClick={handleRefresh} disabled={isLoading}>
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
                      <td className="address">{tokenInfo.mint || 'Not created yet'}</td>
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
              {accounts.length > 0 ? (
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Account</th>
                      <th>Balance</th>
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
                          <td className="address" title={account.publicKey}>
                            {account.publicKey.slice(0, 4)}...{account.publicKey.slice(-4)}
                          </td>
                          <td className="balance">
                            {account.balance?.toLocaleString() || '0'} {tokenInfo?.symbol || ''}
                          </td>
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
            
            <div className="distribution-summary">
              <h3>Distribution Summary</h3>
              {accounts.length > 0 ? (
                <>
                  <div className="summary-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total Accounts</span>
                      <span className="stat-value">{accounts.length}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Whale Accounts</span>
                      <span className="stat-value">{whaleCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Retail Accounts</span>
                      <span className="stat-value">{retailCount}</span>
                    </div>
                    {tokenInfo && (
                      <div className="stat-item">
                        <span className="stat-label">Distributed</span>
                        <span className="stat-value">
                          {totalTokens > 0 
                            ? ((totalTokens / tokenInfo.totalSupply) * 100).toFixed(1) 
                            : '0.0'}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="distribution-chart">
                    <div className="placeholder-chart">
                      <div className="whale-portion" style={{ 
                        width: `${whaleCount / accounts.length * 100}%` 
                      }}>
                        🐋 {((whaleCount / accounts.length) * 100).toFixed(1)}%
                      </div>
                      <div className="retail-portion" style={{ 
                        width: `${retailCount / accounts.length * 100}%` 
                      }}>
                        👤 {((retailCount / accounts.length) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p>No data available for distribution summary.</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  };
  
  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }
  
  return (
    <div className="dashboard" role="main">
      <div className="dashboard-header" role="banner">
        <div className="token-info">
          <h1>{tokenInfo?.name} ({tokenInfo?.symbol})</h1>
          <p>Decimals: {tokenInfo?.decimals} | Total Supply: {tokenInfo?.totalSupply.toLocaleString()}</p>
        </div>
        
        {currentPattern && (
          <div className="trading-status" role="status" aria-live="polite">
            <p>
              Currently running: <strong>{availablePatterns.find(p => p.id === currentPattern)?.name || currentPattern}</strong>
            </p>
            <p>Time remaining: {formatRemainingTime(remainingTime)}</p>
            <div className="progress-bar" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
        )}
      </div>
      
      <div className="dashboard-tabs" role="navigation">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
          aria-pressed={activeTab === 'overview'}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'transactions' ? 'active' : ''} 
          onClick={() => setActiveTab('transactions')}
          aria-pressed={activeTab === 'transactions'}
        >
          Transactions
        </button>
        <button 
          className={activeTab === 'accounts' ? 'active' : ''} 
          onClick={() => setActiveTab('accounts')}
          aria-pressed={activeTab === 'accounts'}
        >
          Accounts
        </button>
        <button 
          className={activeTab === 'wallets' ? 'active' : ''} 
          onClick={() => setActiveTab('wallets')}
          aria-pressed={activeTab === 'wallets'}
        >
          Wallets
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''} 
          onClick={() => setActiveTab('settings')}
          aria-pressed={activeTab === 'settings'}
        >
          Settings
        </button>
        <button 
          className={activeTab === 'admin' ? 'active' : ''} 
          onClick={() => setActiveTab('admin')}
          aria-pressed={activeTab === 'admin'}
        >
          Admin
        </button>
      </div>
      
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="chart-container trading-view-container">
              <h3>Real-time Price Chart (DOGE/USD)</h3>
              <TradingViewWidget />
            </div>
            
            <div className="stats-container">
              <div className="stat-card" role="region" aria-label="Total Transactions">
                <h3>Total Transactions</h3>
                <p className="stat-value">{recentTransactions.length}</p>
              </div>
              <div className="stat-card" role="region" aria-label="Whale Activity">
                <h3>Whale Activity</h3>
                <p className="stat-value">
                  {tradingData.length > 0
                    ? `${Math.round(tradingData.reduce((sum, d) => sum + d.whalePercentage, 0) / tradingData.length)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'accounts' && renderAccountsTab()}
        
        {activeTab === 'transactions' && (
          <div className="transactions-tab">
            <h3>Recent Transactions</h3>
            <div className="transactions-table-container">
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
                      <td>{formatAddress(tx.sender)}</td>
                      <td>{formatAddress(tx.receiver)}</td>
                      <td>{tx.amount.toLocaleString()}</td>
                      <td>{tx.isWhale ? 'Whale' : 'Retail'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'wallets' && (
          <div className="wallets-tab">
            <div className="wallet-summary">
              <h3>Wallet Distribution</h3>
              <div className="chart-container wallet-chart">
                <Doughnut data={walletDistributionData} options={{ maintainAspectRatio: false }} />
              </div>
              
              <div className="wallet-stats">
                {walletSummary.map((wallet, index) => (
                  <div key={index} className="wallet-stat-card">
                    <h3>{wallet.type === 'whale' ? 'Whale Wallets' : 'Retail Wallets'}</h3>
                    <p>Count: {wallet.count}</p>
                    <p>Total Balance: {wallet.totalBalance.toLocaleString()}</p>
                    <p>Supply %: {wallet.percentageOfSupply}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h3>Trading Pattern Settings</h3>
            
            <div className="settings-form">
              <div className="form-group">
                <label htmlFor="pattern-select">Select Pattern:</label>
                <select 
                  id="pattern-select" 
                  value={selectedPattern} 
                  onChange={handlePatternChange}
                  disabled={currentPattern !== null}
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
                      disabled={currentPattern !== null}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="intensity-input">Intensity (1-10):</label>
                    <input 
                      id="intensity-input" 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={patternIntensity} 
                      onChange={(e) => setPatternIntensity(parseInt(e.target.value))}
                      disabled={currentPattern !== null}
                    />
                    <span>{patternIntensity}</span>
                  </div>
                </>
              )}
              
              <div className="form-actions">
                {currentPattern === null ? (
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
        )}

        {activeTab === 'admin' && (
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
        )}
      </div>
    </div>
  );
};

export default Dashboard; 
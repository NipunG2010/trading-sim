import React, { useState, useEffect, useRef } from 'react';
import { Connection } from '@solana/web3.js';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TradingService, TradingPatternType, TradingDataPoint, TokenTransaction, WalletSummary } from '../services/tradingService';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement);

// Trading View Widget Component
const TradingViewWidget = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Clear any existing content
      containerRef.current.innerHTML = '';

      // Create widget container
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget-container';
      widgetContainer.style.height = '100%';
      widgetContainer.style.width = '100%';

      // Create widget div
      const widget = document.createElement('div');
      widget.className = 'tradingview-widget-container__widget';
      widget.style.height = 'calc(100% - 32px)';
      widget.style.width = '100%';

      // Create copyright div
      const copyright = document.createElement('div');
      copyright.className = 'tradingview-widget-copyright';
      copyright.innerHTML = '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>';

      // Create script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: "NASDAQ:AAPL",
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        allow_symbol_change: true,
        calendar: false,
        support_host: "https://www.tradingview.com"
      });

      // Append elements
      widgetContainer.appendChild(widget);
      widgetContainer.appendChild(copyright);
      widgetContainer.appendChild(script);
      containerRef.current.appendChild(widgetContainer);
    }
  }, []);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }}></div>;
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
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: number;
  } | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TokenTransaction[]>([]);
  const [walletSummary, setWalletSummary] = useState<WalletSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'wallets' | 'settings' | 'admin'>('overview');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [adminOutput, setAdminOutput] = useState<string[]>([
    "Welcome to Solana Trading Simulator Admin Console",
    "Use the buttons below to control the simulation",
    "-------------------------------------------"
  ]);
  const [isCommandRunning, setIsCommandRunning] = useState<boolean>(false);
  const adminOutputRef = useRef<HTMLDivElement>(null);
  
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
        setCurrentPattern(status.currentPattern);
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
          totalSupply: info.totalSupply
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
      setCurrentPattern(status.currentPattern);
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
      setCurrentPattern(status.currentPattern);
      setRemainingTime(status.remainingTime);
      setStartTime(status.startTime);
      setTotalDuration(status.totalDuration);
    } catch (error) {
      console.error('Error stopping trading:', error);
    }
  };

  // Execute admin command
  const executeCommand = async (command: string) => {
    if (isCommandRunning) return;
    
    setAdminOutput(prev => [...prev, `> ${command}`]);
    setIsCommandRunning(true);
    
    try {
      // Simulate terminal command execution
      let output: string[] = [];
      
      if (command === 'create-accounts') {
        output = [
          "Creating 50 Solana accounts...",
          "Generating keypairs...",
          "Saving account information...",
          "Accounts created successfully!"
        ];
      } else if (command === 'test-accounts') {
        output = [
          "Testing account access...",
          "Loaded 50 accounts",
          "All accounts accessible",
          "Account test completed successfully!"
        ];
      } else if (command === 'create-source-wallet') {
        output = [
          "Creating source wallet...",
          "Generated new keypair",
          "Public key: Abc123...xyz789",
          "Wallet saved to source-wallet.json",
          "Source wallet created successfully!"
        ];
      } else if (command === 'distribute-sol') {
        output = [
          "Distributing SOL to all accounts...",
          "Loading accounts...",
          "Sending 0.05 SOL to each account...",
          "Transaction 1/50 confirmed",
          "Transaction 2/50 confirmed",
          "...",
          "Transaction 50/50 confirmed",
          "SOL distribution completed successfully!"
        ];
      } else if (command === 'create-token') {
        output = [
          "Creating new token...",
          "Generating token metadata...",
          "Name: SolTrader Token",
          "Symbol: STRD",
          "Decimals: 9",
          "Creating token on Solana...",
          "Token created successfully!",
          "Mint address: DummyMint123...456",
          "Distributing tokens to accounts...",
          "Token distribution completed!"
        ];
      } else if (command === 'run-trading') {
        output = [
          "Starting trading simulation...",
          "Initializing trading engine...",
          "Running default 48-hour trading sequence...",
          "Phase 1: Initial accumulation started",
          "Trading simulation running in background!"
        ];
      } else if (command === 'status') {
        output = [
          "Checking system status...",
          "Connection: Connected to Solana Devnet",
          "Accounts: 50 accounts loaded",
          "Token: SolTrader Token (STRD)",
          "Trading: " + (currentPattern ? `Running ${currentPattern} pattern` : "Not running"),
          "All systems operational!"
        ];
      } else {
        output = [`Unknown command: ${command}`];
      }
      
      // Simulate delay for command execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add output to console
      setAdminOutput(prev => [...prev, ...output, ""]);
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      setAdminOutput(prev => [...prev, `Error: ${error}`, ""]);
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
  
  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="token-info">
          <h1>{tokenInfo?.name} ({tokenInfo?.symbol})</h1>
          <p>Decimals: {tokenInfo?.decimals} | Total Supply: {tokenInfo?.totalSupply.toLocaleString()}</p>
        </div>
        
        {currentPattern && (
          <div className="trading-status">
            <p>
              Currently running: <strong>{availablePatterns.find(p => p.id === currentPattern)?.name || currentPattern}</strong>
            </p>
            <p>Time remaining: {formatRemainingTime(remainingTime)}</p>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${progressPercentage}%` }}></div>
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
            <div className="chart-container trading-view-container">
              <h3>Price Chart</h3>
              <TradingViewWidget />
            </div>
            
            <div className="chart-container">
              <h3>Volume Chart</h3>
              <Bar data={volumeChartData} options={{ maintainAspectRatio: false }} />
            </div>
            
            <div className="stats-container">
              <div className="stat-card">
                <h3>Total Transactions</h3>
                <p className="stat-value">{recentTransactions.length}</p>
              </div>
              <div className="stat-card">
                <h3>Average Volume</h3>
                <p className="stat-value">
                  {tradingData.length > 0
                    ? Math.round(tradingData.reduce((sum, d) => sum + d.volume, 0) / tradingData.length).toLocaleString()
                    : '0'}
                </p>
              </div>
              <div className="stat-card">
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
                    </button>
                    <button 
                      className="admin-button" 
                      onClick={() => executeCommand('test-accounts')}
                      disabled={isCommandRunning}
                    >
                      Test Accounts
                    </button>
                    <button 
                      className="admin-button" 
                      onClick={() => executeCommand('create-source-wallet')}
                      disabled={isCommandRunning}
                    >
                      Create Source Wallet
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
                    </button>
                    <button 
                      className="admin-button" 
                      onClick={() => executeCommand('create-token')}
                      disabled={isCommandRunning}
                    >
                      Create Token
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
                  {adminOutput.map((line, index) => (
                    <div key={index} className={line.startsWith('>') ? 'command-line' : ''}>
                      {line}
                    </div>
                  ))}
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
import React, { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TradingService, TradingPatternType, TradingDataPoint, TokenTransaction, WalletSummary } from '../services/tradingService.js';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

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
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'wallets' | 'settings'>('overview');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  
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
    
    // Set up polling for updates
    const dataInterval = setInterval(async () => {
      try {
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
        
        // Get recent transactions
        const transactions = await tradingService.getRecentTransactions(10);
        setRecentTransactions(transactions);
        
        // Get wallet summary
        const wallets = await tradingService.getWalletSummary();
        setWalletSummary(wallets);
      } catch (error) {
        console.error('Error updating data:', error);
      }
    }, 5000); // Update every 5 seconds
    
    return () => {
      clearInterval(dataInterval);
    };
  }, [connection, tokenMint]);
  
  // Format data for price chart
  const priceChartData = {
    labels: tradingData.map(data => new Date(data.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Price (SOL)',
        data: tradingData.map(data => data.price),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
        fill: false
      }
    ]
  };
  
  // Format data for volume chart
  const volumeChartData = {
    labels: tradingData.map(data => new Date(data.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Volume',
        data: tradingData.map(data => data.volume),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        tension: 0.1,
        fill: true
      }
    ]
  };
  
  // Format data for trade count chart
  const tradeCountChartData = {
    labels: tradingData.map(data => new Date(data.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Trade Count',
        data: tradingData.map(data => data.tradeCount),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        tension: 0.1
      }
    ]
  };
  
  // Format data for whale percentage chart
  const whalePercentageChartData = {
    labels: tradingData.map(data => new Date(data.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Whale Activity (%)',
        data: tradingData.map(data => data.whalePercentage * 100),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.1,
        fill: true
      }
    ]
  };
  
  // Format data for wallet distribution chart
  const walletDistributionData = {
    labels: walletSummary.map(wallet => `${wallet.type.charAt(0).toUpperCase() + wallet.type.slice(1)} (${wallet.count})`),
    datasets: [
      {
        label: 'Token Distribution',
        data: walletSummary.map(wallet => wallet.totalBalance),
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
  
  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Token Trading Activity',
      },
    },
    scales: {
      y: {
        beginAtZero: false
      }
    }
  };
  
  // Handle pattern selection
  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patternId = e.target.value as TradingPatternType | '';
    setSelectedPattern(patternId);
    
    // Set default duration and intensity based on selected pattern
    if (patternId) {
      const pattern = availablePatterns.find(p => p.id === patternId);
      if (pattern) {
        setPatternDuration(pattern.defaultDuration);
        setPatternIntensity(pattern.defaultIntensity);
      }
    }
  };
  
  // Handle start trading
  const handleStartTrading = async () => {
    if (!selectedPattern) return;
    
    try {
      // Start trading
      const success = await tradingService.startTrading({
        type: selectedPattern,
        duration: patternDuration,
        intensity: patternIntensity
      });
      
      if (success) {
        // Get updated status
        const status = await tradingService.getTradingStatus();
        setCurrentPattern(status.currentPattern);
        setRemainingTime(status.remainingTime);
        setStartTime(status.startTime);
        setTotalDuration(status.totalDuration);
        
        // Switch to overview tab
        setActiveTab('overview');
      }
    } catch (error) {
      console.error('Error starting trading:', error);
      alert('Failed to start trading. See console for details.');
    }
  };
  
  // Handle stop trading
  const handleStopTrading = async () => {
    try {
      // Stop trading
      const success = await tradingService.stopTrading();
      
      if (success) {
        // Get updated status
        const status = await tradingService.getTradingStatus();
        setCurrentPattern(status.currentPattern);
        setRemainingTime(status.remainingTime);
        setStartTime(status.startTime);
        setTotalDuration(status.totalDuration);
      }
    } catch (error) {
      console.error('Error stopping trading:', error);
      alert('Failed to stop trading. See console for details.');
    }
  };
  
  // Format remaining time
  const formatRemainingTime = (ms: number | null) => {
    if (ms === null) return '--:--:--';
    
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Format address
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };
  
  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }
  
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Solana Token Trading Simulator</h1>
        <div className="tabs">
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
        </div>
      </header>
      
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="status-panel">
              <div className="token-info">
                <h2>Token Information</h2>
                <p><strong>Mint Address:</strong> {tokenMint}</p>
                {tokenInfo && (
                  <>
                    <p><strong>Name:</strong> {tokenInfo.name}</p>
                    <p><strong>Symbol:</strong> {tokenInfo.symbol}</p>
                    <p><strong>Decimals:</strong> {tokenInfo.decimals}</p>
                    <p><strong>Total Supply:</strong> {tokenInfo.totalSupply.toLocaleString()}</p>
                  </>
                )}
              </div>
              
              <div className="trading-status">
                <h2>Trading Status</h2>
                <p><strong>Current Pattern:</strong> {currentPattern ? availablePatterns.find(p => p.id === currentPattern)?.name || currentPattern : 'None'}</p>
                <p><strong>Remaining Time:</strong> {formatRemainingTime(remainingTime)}</p>
                
                {currentPattern && (
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
                    <span className="progress-text">{progressPercentage.toFixed(1)}% Complete</span>
                  </div>
                )}
                
                <div className="status-actions">
                  {currentPattern ? (
                    <button className="stop-button" onClick={handleStopTrading}>Stop Trading</button>
                  ) : (
                    <button className="start-button" onClick={() => setActiveTab('settings')}>Start New Pattern</button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="charts-grid">
              <div className="chart-container">
                <h3>Price Chart</h3>
                <Line data={priceChartData} options={chartOptions} />
              </div>
              
              <div className="chart-container">
                <h3>Volume Chart</h3>
                <Bar data={volumeChartData} options={chartOptions} />
              </div>
              
              <div className="chart-container">
                <h3>Trade Count</h3>
                <Line data={tradeCountChartData} options={chartOptions} />
              </div>
              
              <div className="chart-container">
                <h3>Whale Activity</h3>
                <Line data={whalePercentageChartData} options={chartOptions} />
              </div>
            </div>
            
            <div className="recent-transactions">
              <h3>Recent Transactions</h3>
              <table>
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
                  {recentTransactions.slice(0, 5).map((tx, index) => (
                    <tr key={index} className={tx.isWhale ? 'whale-tx' : 'retail-tx'}>
                      <td>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                      <td>{formatAddress(tx.sender)}</td>
                      <td>{formatAddress(tx.receiver)}</td>
                      <td>{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td>{tx.isWhale ? '🐋 Whale' : '👤 Retail'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="view-all-button" onClick={() => setActiveTab('transactions')}>View All</button>
            </div>
          </div>
        )}
        
        {activeTab === 'transactions' && (
          <div className="transactions-tab">
            <h2>Recent Transactions</h2>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Signature</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx, index) => (
                  <tr key={index} className={tx.isWhale ? 'whale-tx' : 'retail-tx'}>
                    <td>{formatTimestamp(tx.timestamp)}</td>
                    <td>{formatAddress(tx.sender)}</td>
                    <td>{formatAddress(tx.receiver)}</td>
                    <td>{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{tx.isWhale ? '🐋 Whale' : '👤 Retail'}</td>
                    <td className="signature">{formatAddress(tx.signature)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'wallets' && (
          <div className="wallets-tab">
            <h2>Wallet Distribution</h2>
            
            <div className="wallet-summary">
              <div className="wallet-chart">
                <Doughnut 
                  data={walletDistributionData} 
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      title: {
                        display: true,
                        text: 'Token Distribution by Wallet Type',
                      },
                    },
                  }} 
                />
              </div>
              
              <div className="wallet-stats">
                <table>
                  <thead>
                    <tr>
                      <th>Wallet Type</th>
                      <th>Count</th>
                      <th>Total Balance</th>
                      <th>% of Supply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletSummary.map((wallet, index) => (
                      <tr key={index} className={`${wallet.type}-row`}>
                        <td>{wallet.type.charAt(0).toUpperCase() + wallet.type.slice(1)}</td>
                        <td>{wallet.count}</td>
                        <td>{wallet.totalBalance.toLocaleString()}</td>
                        <td>{(wallet.percentageOfSupply * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h2>Trading Pattern Settings</h2>
            
            <div className="pattern-selector">
              <label htmlFor="pattern-select">Select Trading Pattern:</label>
              <select 
                id="pattern-select" 
                value={selectedPattern} 
                onChange={handlePatternChange}
                disabled={!!currentPattern}
              >
                <option value="">-- Select Pattern --</option>
                {availablePatterns.map(pattern => (
                  <option key={pattern.id} value={pattern.id}>{pattern.name}</option>
                ))}
              </select>
              
              {selectedPattern && (
                <div className="pattern-description">
                  {availablePatterns.find(p => p.id === selectedPattern)?.description}
                </div>
              )}
            </div>
            
            <div className="pattern-config">
              <div className="config-item">
                <label htmlFor="duration-input">Duration (minutes):</label>
                <input 
                  id="duration-input" 
                  type="number" 
                  min="1" 
                  max="120" 
                  value={patternDuration} 
                  onChange={(e) => setPatternDuration(parseInt(e.target.value) || 1)}
                  disabled={!!currentPattern}
                />
              </div>
              
              <div className="config-item">
                <label htmlFor="intensity-slider">Intensity:</label>
                <input 
                  id="intensity-slider" 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={patternIntensity} 
                  onChange={(e) => setPatternIntensity(parseInt(e.target.value))}
                  disabled={!!currentPattern}
                />
                <span className="intensity-value">{patternIntensity}/10</span>
              </div>
            </div>
            
            <div className="pattern-actions">
              <button 
                className="start-button" 
                onClick={handleStartTrading} 
                disabled={!selectedPattern || !!currentPattern}
              >
                Start Trading
              </button>
              
              {currentPattern && (
                <div className="warning-message">
                  <p>A trading pattern is currently running. Stop it before starting a new one.</p>
                  <button className="stop-button" onClick={handleStopTrading}>Stop Current Pattern</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <footer className="dashboard-footer">
        <p>Solana Token Trading Simulator - Running on {connection.rpcEndpoint}</p>
      </footer>
    </div>
  );
};

export default Dashboard; 
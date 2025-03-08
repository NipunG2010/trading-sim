import React, { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TradingService, TradingPatternType, TradingDataPoint } from '../services/tradingService';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
        
        // Get token info
        const info = await tradingService.getTokenInfo();
        setTokenInfo({
          name: info.name,
          symbol: info.symbol,
          decimals: info.decimals,
          totalSupply: info.totalSupply
        });
        
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
        tension: 0.1
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
        tension: 0.1
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
  };
  
  // Handle pattern selection
  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patternId = e.target.value as TradingPatternType | '';
    setSelectedPattern(patternId);
    
    // Set default duration and intensity based on selected pattern
    if (patternId) {
      const pattern = availablePatterns.find(p => p.id === patternId);
      if (pattern) {
        setPatternDuration(pattern.defaultDuration / (60 * 1000)); // Convert to minutes
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
        duration: patternDuration * 60 * 1000, // Convert minutes to milliseconds
        intensity: patternIntensity
      });
      
      if (success) {
        // Get updated status
        const status = await tradingService.getTradingStatus();
        setCurrentPattern(status.currentPattern);
        setRemainingTime(status.remainingTime);
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
  
  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }
  
  return (
    <div className="dashboard">
      <h1>Solana Token Trading Simulator</h1>
      
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
        <p><strong>Current Pattern:</strong> {currentPattern || 'None'}</p>
        <p><strong>Remaining Time:</strong> {formatRemainingTime(remainingTime)}</p>
      </div>
      
      <div className="charts">
        <div className="chart">
          <h3>Price Chart</h3>
          <Line data={priceChartData} options={chartOptions} />
        </div>
        
        <div className="chart">
          <h3>Volume Chart</h3>
          <Line data={volumeChartData} options={chartOptions} />
        </div>
      </div>
      
      <div className="trading-controls">
        <h2>Trading Controls</h2>
        
        <div className="control-group">
          <label htmlFor="pattern-select">Select Pattern:</label>
          <select 
            id="pattern-select" 
            value={selectedPattern} 
            onChange={handlePatternChange}
            disabled={!!currentPattern}
          >
            <option value="">-- Select Pattern --</option>
            {availablePatterns.map(pattern => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.name} - {pattern.description}
              </option>
            ))}
          </select>
        </div>
        
        <div className="control-group">
          <label htmlFor="duration-input">Duration (minutes):</label>
          <input 
            id="duration-input" 
            type="number" 
            min="1" 
            max="1440" 
            value={patternDuration} 
            onChange={(e) => setPatternDuration(parseInt(e.target.value))}
            disabled={!!currentPattern}
          />
        </div>
        
        <div className="control-group">
          <label htmlFor="intensity-input">Intensity (1-10):</label>
          <input 
            id="intensity-input" 
            type="range" 
            min="1" 
            max="10" 
            value={patternIntensity} 
            onChange={(e) => setPatternIntensity(parseInt(e.target.value))}
            disabled={!!currentPattern}
          />
          <span>{patternIntensity}</span>
        </div>
        
        <div className="control-buttons">
          {!currentPattern ? (
            <button 
              onClick={handleStartTrading} 
              disabled={!selectedPattern}
            >
              Start Trading
            </button>
          ) : (
            <button 
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

export default Dashboard; 
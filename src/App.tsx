import React, { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';
import './App.css';
import Dashboard from './components/Dashboard';

function App() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [tokenMint, setTokenMint] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Solana connection
    const initConnection = async () => {
      try {
        // Connect to Solana devnet
        const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
        setConnection(conn);
        
        // Try to load token info from local storage or file
        try {
          // In a real app, we would load this from an API or file
          // For now, we'll use a mock token mint address
          setTokenMint('TokenMintAddressWouldGoHere');
        } catch (err) {
          console.error('Error loading token info:', err);
          setError('Failed to load token information. Please check if token-info.json exists.');
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing connection:', err);
        setError('Failed to connect to Solana network. Please check your internet connection.');
        setIsLoading(false);
      }
    };
    
    initConnection();
  }, []);

  if (isLoading) {
    return (
      <div className="App">
        <header className="App-header">
          <p>Loading Solana Token Trading Simulator...</p>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <header className="App-header">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </header>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="App">
        <header className="App-header">
          <p>Failed to establish connection to Solana network.</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <Dashboard connection={connection} tokenMint={tokenMint} />
    </div>
  );
}

export default App;

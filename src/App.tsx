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
        
        // Try to load token info from token-info.json
        try {
          // In a real app, we would load this from an API
          // For now, we'll try to load from the token-info.json file
          const response = await fetch('/token-info.json');
          if (!response.ok) {
            throw new Error('Failed to load token info');
          }
          
          const tokenInfo = await response.json();
          setTokenMint(tokenInfo.mint);
          console.log('Loaded token info:', tokenInfo);
        } catch (err) {
          console.error('Error loading token info:', err);
          // Fallback to the dummy token mint from our mock data
          setTokenMint('DummyMintAddressReplace1111111111111111111111111');
          console.log('Using dummy token mint address');
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

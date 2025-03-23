import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, ButtonGroup } from '@mui/material';
import { Terminal as TerminalIcon } from '@mui/icons-material';
import { SOLANA_COMMANDS } from '../server/routes/terminal.js';

interface CommandOutput {
  command: string;
  output: string;
  timestamp: string;
}

const TOKEN_OPERATIONS = [
  { label: 'Create Account', command: 'solana-keygen grind --starts-with dad:1' },
  { label: 'Set Devnet', command: 'solana config set --url devnet' },
  { label: 'Get Config', command: 'solana config get' },
  { label: 'Get Balance', command: 'solana balance' },
  { label: 'Create Mint', command: 'solana-keygen grind --starts-with mnt:1' },
];

const TerminalPanel: React.FC = () => {
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandOutput[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    const timestamp = new Date().toLocaleTimeString();
    setIsLoading(true);
    
    try {
      // Special handling for create-token command
      if (cmd === 'create-token') {
        // First execute the Solana command
        const response = await fetch('/api/terminal/execute-command', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command: SOLANA_COMMANDS.CREATE_TOKEN }),
        });

        const data = await response.json();
        
        if (data.success) {
          // Extract mint address from the output
          const mintAddressMatch = data.output.match(/Creating token ([a-zA-Z0-9]{32,})/);
          if (mintAddressMatch && mintAddressMatch[1]) {
            const mintAddress = mintAddressMatch[1];
            
            // Update token info with the new mint address
            const tokenResponse = await fetch('/api/create-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ mintAddress }),
            });

            const tokenData = await tokenResponse.json();
            
            if (!tokenResponse.ok) {
              throw new Error(tokenData.error || 'Failed to update token info');
            }
            
            setCommandHistory(prev => [...prev, {
              command: cmd,
              output: `Token created successfully!\nMint Address: ${mintAddress}`,
              timestamp,
            }]);
          } else {
            throw new Error('Could not extract mint address from command output');
          }
        } else {
          throw new Error(data.error || 'Failed to create token');
        }
      } else {
        // Handle other commands normally
        const response = await fetch('/api/terminal/execute-command', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command: cmd }),
        });

        const data = await response.json();
        
        setCommandHistory(prev => [...prev, {
          command: cmd,
          output: data.success ? data.output : `Error: ${data.error}`,
          timestamp,
        }]);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setCommandHistory(prev => [...prev, {
        command: cmd,
        output: `Error: ${errorMessage}`,
        timestamp,
      }]);
    } finally {
      setIsLoading(false);
      setCommand('');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        <TerminalIcon sx={{ mr: 1 }} />
        Solana Token Operations Console
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Quick Actions:</Typography>
        <ButtonGroup variant="outlined" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {TOKEN_OPERATIONS.map((op, index) => (
            <Button 
              key={index}
              onClick={() => executeCommand(op.command)}
              disabled={isLoading}
              sx={{ mb: 1 }}
            >
              {op.label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>
      
      <Paper sx={{ 
        p: 2, 
        bgcolor: '#1e1e1e',
        color: '#fff',
        fontFamily: 'monospace',
        height: '400px',
        overflowY: 'auto',
        mb: 2
      }}>
        {commandHistory.map((entry, index) => (
          <Box key={index} sx={{ mb: 1 }}>
            <Box sx={{ color: '#00ff00' }}>
              {`[${entry.timestamp}] $ ${entry.command}`}
            </Box>
            <Box sx={{ color: '#ffffff', whiteSpace: 'pre-wrap' }}>
              {entry.output}
            </Box>
          </Box>
        ))}
      </Paper>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          value={command}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCommand(e.target.value)}
          onKeyPress={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !isLoading) {
              executeCommand(command);
            }
          }}
          placeholder="Enter command..."
          disabled={isLoading}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#666',
              },
              '&:hover fieldset': {
                borderColor: '#999',
              },
            },
          }}
        />
        <Button 
          variant="contained" 
          onClick={() => executeCommand(command)}
          disabled={isLoading}
          sx={{ minWidth: '100px' }}
        >
          {isLoading ? 'Running...' : 'Execute'}
        </Button>
      </Box>
    </Box>
  );
};

export default TerminalPanel; 
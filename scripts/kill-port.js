const { exec } = require('child_process');
const port = process.argv[2] || '3001';

// For Windows
if (process.platform === 'win32') {
  exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
    if (error) {
      console.log(`No process found using port ${port}`);
      return;
    }

    const lines = stdout.split('\n');
    lines.forEach(line => {
      const match = line.match(/\s+(\d+)$/);
      if (match && match[1]) {
        const pid = match[1];
        exec(`taskkill /F /PID ${pid}`, (error) => {
          if (error) {
            console.error(`Error killing process ${pid}:`, error);
          } else {
            console.log(`Successfully killed process ${pid}`);
          }
        });
      }
    });
  });
} else {
  // For Unix-like systems
  exec(`lsof -i :${port} | grep LISTEN | awk '{print $2}'`, (error, stdout, stderr) => {
    if (error) {
      console.log(`No process found using port ${port}`);
      return;
    }

    const pids = stdout.trim().split('\n').filter(pid => pid);
    if (pids.length === 0) {
      console.log(`No process found using port ${port}`);
      return;
    }

    pids.forEach(pid => {
      if (pid) {
        exec(`kill -9 ${pid}`, (error) => {
          if (error) {
            console.error(`Error killing process ${pid}:`, error);
          } else {
            console.log(`Successfully killed process ${pid}`);
          }
        });
      }
    });
  });
} 
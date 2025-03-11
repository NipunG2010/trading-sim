// Simple test script for Node.js
console.log("Hello from Node.js!");
console.log("Current directory:", process.cwd());
console.log("Files in directory:");

const fs = require('fs');
fs.readdirSync('.').forEach(file => {
  const stats = fs.statSync(file);
  console.log(`- ${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
});

console.log("Test complete!"); 
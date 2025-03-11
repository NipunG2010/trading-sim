// Test script for account creation and display
import fs from 'fs';
import { execSync } from 'child_process';

console.log("🧪 Testing account creation and display");

// Delete existing accounts.json if it exists
if (fs.existsSync('accounts.json')) {
  console.log("🗑️ Removing existing accounts.json for testing");
  fs.unlinkSync('accounts.json');
}

// Create accounts
console.log("🚀 Creating accounts...");
try {
  const output = execSync('node src/accounts.js', { encoding: 'utf8' });
  console.log(output);
} catch (error) {
  console.error("❌ Error creating accounts:", error.message);
  process.exit(1);
}

// Verify accounts were created
if (fs.existsSync('accounts.json')) {
  try {
    const data = fs.readFileSync('accounts.json', { encoding: 'utf8' });
    const accounts = JSON.parse(data);
    console.log(`✅ Successfully created and verified ${accounts.length} accounts`);
    console.log(`   - ${accounts.filter(a => a.type === "whale").length} whale accounts`);
    console.log(`   - ${accounts.filter(a => a.type === "retail").length} retail accounts`);
  } catch (error) {
    console.error("❌ Error reading accounts.json:", error.message);
  }
} else {
  console.error("❌ accounts.json was not created");
  process.exit(1);
}

console.log("✅ Account creation and display test completed successfully"); 
const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

async function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return stdout.trim();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function createToken() {
  try {
    // 1. Create mint authority account starting with 'dad'
    console.log("\n🔑 Creating mint authority account...");
    await runCommand('solana-keygen grind --starts-with dad:1', 'Generating dad account');
    
    // 2. Set as default keypair
    const dadKeyFile = fs.readdirSync('.').find(file => file.startsWith('dad'));
    if (!dadKeyFile) throw new Error("Dad keypair file not found");
    await runCommand(`solana config set --keypair ${dadKeyFile}`, 'Setting dad account as default');
    
    // 3. Switch to devnet
    await runCommand('solana config set --url devnet', 'Switching to devnet');
    
    // 4. Verify config
    await runCommand('solana config get', 'Verifying configuration');
    
    // 5. Get wallet address
    const address = await runCommand('solana address', 'Getting wallet address');
    console.log(`\n💳 Your wallet address is: ${address}`);
    console.log("⚠️ Please fund this address with SOL from https://faucet.solana.com/");
    
    // Wait for user to fund wallet
    console.log("\n⏳ Waiting 30 seconds for funding...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 6. Check balance
    await runCommand('solana balance', 'Checking balance');
    
    // 7. Create mint address starting with 'mnt'
    console.log("\n🏭 Creating mint address...");
    await runCommand('solana-keygen grind --starts-with mnt:1', 'Generating mint account');
    
    // 8. Create token with metadata
    const mintKeyFile = fs.readdirSync('.').find(file => file.startsWith('mnt'));
    if (!mintKeyFile) throw new Error("Mint keypair file not found");
    
    // 9. Create metadata file
    const metadata = {
      name: "Trading Simulator Token",
      symbol: "TSIM",
      description: "Token for Solana Trading Simulator",
      image: "https://your-image-url.com/image.png" // Replace with your image URL
    };
    
    fs.writeFileSync('metadata.json', JSON.stringify(metadata, null, 2));
    console.log("\n📝 Created metadata.json - Please upload to IPFS and update the URL in the file");
    
    // 10. Create the token
    await runCommand(`spl-token create-token \\
      --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \\
      --enable-metadata \\
      --decimals 9 \\
      ${mintKeyFile}`, 'Creating token');
    
    // 11. Initialize metadata
    const mintAddress = await runCommand(`spl-token create-account ${mintKeyFile}`, 'Creating token account');
    
    await runCommand(`spl-token initialize-metadata \\
      ${mintAddress} \\
      "${metadata.name}" \\
      "${metadata.symbol}" \\
      "metadata-url-here"`, 'Initializing metadata');
    
    // 12. Mint initial supply
    await runCommand(`spl-token mint ${mintAddress} 1000000000`, 'Minting initial supply');
    
    // 13. Disable minting and freezing
    await runCommand(`spl-token authorize ${mintAddress} mint --disable`, 'Disabling minting');
    await runCommand(`spl-token authorize ${mintAddress} freeze --disable`, 'Disabling freezing');
    
    console.log("\n✅ Token creation completed!");
    console.log(`\n📊 Token Details:`);
    console.log(`Mint Address: ${mintAddress}`);
    console.log(`Name: ${metadata.name}`);
    console.log(`Symbol: ${metadata.symbol}`);
    
    return {
      mintAddress,
      metadata
    };
  } catch (error) {
    console.error("\n❌ Token creation failed:", error.message);
    throw error;
  }
}

module.exports = { createToken }; 
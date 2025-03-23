#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Run a command and log its output
 * @param {string} command Command to run
 * @param {string} description Description of the command
 */
async function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  const { stdout, stderr } = await execAsync(command);
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  return stdout.trim();
}

/**
 * Create a token using the source wallet
 */
async function createToken() {
  try {
    console.log("\n🚀 Starting Community Token Creation Process...");
    
    console.log("\n⚠️ Make sure you have Solana CLI tools installed:");
    console.log("- solana-keygen");
    console.log("- spl-token");

    // Check if source wallet exists
    if (!fs.existsSync("source-wallet.json")) {
      throw new Error("source-wallet.json not found. Please run create-source-wallet first.");
    }

    // Set source wallet as default keypair
    await runCommand(
      `solana config set --keypair source-wallet.json`,
      "Setting source wallet as default keypair"
    );


    // Get wallet address
    const walletAddress = await runCommand(
      `solana address`,
      "Getting wallet address"
    );
    console.log(`\n💳 Your wallet address is: ${walletAddress}`);

    // Check balance
    const balance = await runCommand(
      `solana balance`,
      "Checking balance"
    );
    console.log(`\n💰 Current balance: ${balance}`);

    if (balance === '0 SOL') {
      throw new Error("Wallet has no SOL. Please fund it before creating token.");
    }

    // Create mint address with 'community' prefix
    console.log("\n🏭 Creating community mint address...");
    await runCommand(
      `solana-keygen grind --starts-with community:1`,
      "Generating community mint account"
    );

    // Find the generated mint keypair file
    const mintFiles = fs.readdirSync('.')
      .filter(file => file.startsWith('community') && file.endsWith('.json'));
    
    if (mintFiles.length === 0) {
      throw new Error("No community mint keypair file found");
    }
    const mintKeypairFile = mintFiles[0];
    const mintAddress = mintKeypairFile.replace('.json', '');

    // Create metadata.json
    const metadata = {
      name: "Community Trading Token",
      symbol: "UNITY",
      description: "A community-driven token for trading simulation and education",
      image: "https://arweave.net/placeholder", // You'll need to update this
      animation_url: "",
      external_url: "",
      attributes: [
        {
          trait_type: "Type",
          value: "Community Token"
        },
        {
          trait_type: "Purpose",
          value: "Trading Education"
        }
      ],
      properties: {
        files: [
          {
            uri: "https://arweave.net/placeholder", // You'll need to update this
            type: "image/png"
          }
        ],
        category: "image",
        creators: [
          {
            address: walletAddress,
            share: 100
          }
        ]
      }
    };

    fs.writeFileSync('metadata.json', JSON.stringify(metadata, null, 2));
    console.log('\n📝 Created metadata.json - Please upload to IPFS and update the URL in the file');

    // Create token with metadata support
    console.log('\n🔄 Creating token...');
    try {
      await runCommand(
        `spl-token create-token ${mintKeypairFile} --decimals 9`,
        "Creating community token"
      );
    } catch (error) {
      throw new Error(`Token creation failed: ${error.message}`);
    }

    // Initialize metadata
    console.log('\n🔄 Initializing metadata...');
    try {
      await runCommand(
        `spl-token initialize-metadata ${mintAddress} "Community Trading Token" CTT "https://arweave.net/placeholder"`,
        "Initializing token metadata"
      );
    } catch (error) {
      throw new Error(`Metadata initialization failed: ${error.message}`);
    }

    // Create token account
    console.log('\n🔄 Creating token account...');
    try {
      await runCommand(
        `spl-token create-account ${mintAddress}`,
        "Creating token account"
      );
    } catch (error) {
      throw new Error(`Token account creation failed: ${error.message}`);
    }

    // Mint initial supply (1 billion tokens)
    console.log('\n🔄 Minting initial supply...');
    try {
      await runCommand(
        `spl-token mint ${mintAddress} 1000000000`,
        "Minting initial supply"
      );
    } catch (error) {
      throw new Error(`Token minting failed: ${error.message}`);
    }

    // Disable minting
    console.log('\n🔄 Disabling minting...');
    try {
      await runCommand(
        `spl-token authorize ${mintAddress} mint --disable`,
        "Disabling minting authority"
      );
    } catch (error) {
      throw new Error(`Failed to disable minting: ${error.message}`);
    }

    // Save token info
    const tokenInfo = {
      mint: mintAddress,
      authority: walletAddress,
      decimals: 9,
      metadata: metadata
    };

    // Ensure public directory exists
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public');
    }

    fs.writeFileSync('token-info.json', JSON.stringify(tokenInfo, null, 2));
    fs.writeFileSync('public/token-info.json', JSON.stringify(tokenInfo, null, 2));

    console.log('\n✅ Community token creation completed successfully!');
    console.log('\n📝 Token information:');
    console.log(`Mint Address: ${tokenInfo.mint}`);
    console.log(`Authority: ${tokenInfo.authority}`);
    console.log(`Decimals: ${tokenInfo.decimals}`);
    console.log('\nToken info saved to token-info.json and public/token-info.json');
    
    console.log('\n📝 Next steps:');
    console.log('1. Upload token image to IPFS/Arweave');
    console.log('2. Update metadata.json with the correct image URL');
    console.log('3. Upload metadata.json to IPFS/Arweave');
    console.log('4. Update token metadata with the final metadata URL');
    console.log('5. Start the trading simulation');

  } catch (error) {
    console.error(`\n❌ ${error.message}`);
    process.exit(1);
  }
}

createToken().catch(console.error); 
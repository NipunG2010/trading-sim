import { SolanaAgentKit, createSolanaTools } from "solana-agent-kit";

async function inspectExports() {
  const kit = new SolanaAgentKit();
  console.log('Available methods:', Object.keys(kit));
  
  try {
    const connection = await kit.createConnection();
    console.log('Connection methods:', Object.keys(connection));
  } catch (error) {
    console.error('Inspection failed:', error);
  }
}

inspectExports().catch(console.error);
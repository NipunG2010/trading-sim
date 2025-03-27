// Issue: Missing proper confirmation status tracking
// Solution: Add robust confirmation checking

const confirmTransaction = async (signature: string) => {
  const latestBlockhash = await connection.getLatestBlockhash();
  
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
  });
  
  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${confirmation.value.err}`);
  }
  
  return confirmation;
}; 
// src/simple-test.ts
// Add export to make this a module
export {};

console.log("Hello from TypeScript!");

// Test async/await
async function testAsync(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Async function completed");
    }, 1000);
  });
}

// Run the test
async function main() {
  console.log("Starting test...");
  const result = await testAsync();
  console.log(result);
  console.log("Test completed");
}

main().catch(error => console.error("Error:", error)); 
// src/node-test-cjs.cjs
console.log("Hello from Node.js (CommonJS)!");
console.log("Node.js version:", process.version);
console.log("Current directory:", process.cwd());
console.log("Environment variables:", process.env.NODE_ENV || "not set");

// Test async/await
async function testAsync() {
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
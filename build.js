#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Building SQL Custom Command for deployment...\n");

// Check if required directories exist
const clientDir = path.join(__dirname, "client");
const serverDir = path.join(__dirname, "server");

if (!fs.existsSync(clientDir)) {
  console.error("❌ Client directory not found");
  process.exit(1);
}

if (!fs.existsSync(serverDir)) {
  console.error("❌ Server directory not found");
  process.exit(1);
}

try {
  // Install client dependencies
  console.log("📦 Installing client dependencies...");
  execSync("npm install", { cwd: clientDir, stdio: "inherit" });

  // Build client
  console.log("🔨 Building client...");
  execSync("npm run build", { cwd: clientDir, stdio: "inherit" });

  // Install server dependencies
  console.log("📦 Installing server dependencies...");
  execSync("npm install", { cwd: serverDir, stdio: "inherit" });

  console.log("✅ Build completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("1. Set up environment variables in Vercel");
  console.log("2. Deploy to Vercel using the DEPLOYMENT.md guide");
  console.log("3. Test your deployed application");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}

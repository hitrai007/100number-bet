require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Load .env file

// Ensure environment variables are loaded
const baseSepoliaRpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
const privateKey = process.env.BASE_SEPOLIA_PRIVATE_KEY;

if (!privateKey) {
  console.error("Please set your BASE_SEPOLIA_PRIVATE_KEY in a .env file");
  process.exit(1);
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20", // Match contract pragma
  networks: {
    baseSepolia: {
      url: baseSepoliaRpcUrl || "https://sepolia.base.org", // Use env var or default
      accounts: [privateKey],
    },
    // You can add other networks here (e.g., hardhat local network)
    hardhat: {
      // Configuration for local testing network
    },
  },
  // Optional: Add Etherscan config for verification
  // etherscan: {
  //   apiKey: {
  //     baseSepolia: process.env.BASESCAN_API_KEY || "",
  //   }
  // },
};

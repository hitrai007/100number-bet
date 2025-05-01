const { ethers } = require("hardhat");

async function main() {
  const usdtAddress = "0xEF37f57D8a64Fd6EdF2184Ad4b2c4Cd718ec4538"; // Base Sepolia Mock USDT

  console.log("Deploying NumberBet contract...");
  const NumberBet = await ethers.getContractFactory("NumberBet");
  const numberBet = await NumberBet.deploy(usdtAddress);

  // Correctly wait for deployment confirmation
  await numberBet.waitForDeployment();

  // Correctly get the deployed contract's address
  const contractAddress = await numberBet.getAddress();
  console.log(`NumberBet deployed to: ${contractAddress} on Base Sepolia`);

  // Optional: Log the transaction hash
  if (numberBet.deploymentTransaction()) {
      console.log("Deployment Transaction Hash:", numberBet.deploymentTransaction().hash);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 
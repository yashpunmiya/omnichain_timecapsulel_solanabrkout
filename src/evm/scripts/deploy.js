// Script to deploy TimeCapsuleReceiver contract
const hre = require("hardhat");

async function main() {
  console.log("Deploying TimeCapsuleReceiver...");

  // Get the LayerZero endpoint address for the current network
  const network = hre.network.name;
  
  // LayerZero V2 endpoint addresses (update with actual addresses)
  const endpoints = {
    "hardhat": "0x1234567890123456789012345678901234567890", // Replace with a mock address for testing
    "sepolia": "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero V2 Sepolia endpoint
    "arbitrumSepolia": "0x6098e96a28E02f27B1e6BD381f870F1C8Bd169d3" // LayerZero V2 Arbitrum Sepolia endpoint
  };
  
  const layerZeroEndpoint = endpoints[network];
  if (!layerZeroEndpoint) {
    throw new Error(`No LayerZero endpoint configured for ${network}`);
  }
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Deploy the TimeCapsuleReceiver contract
  const TimeCapsuleReceiver = await hre.ethers.getContractFactory("TimeCapsuleReceiver");
  const timeCapsuleReceiver = await TimeCapsuleReceiver.deploy(
    layerZeroEndpoint,           // LayerZero endpoint address
    deployer.address,            // Owner address
    "TimeCapsule Released",      // NFT name
    "TIMECAP"                    // NFT symbol
  );
  
  await timeCapsuleReceiver.deployed();
  console.log(`TimeCapsuleReceiver deployed to: ${timeCapsuleReceiver.address}`);
  
  // Allow Solana chain ID (Solana's LayerZero Chain ID is usually 168)
  const SOLANA_CHAIN_ID = 168;
  
  console.log(`Setting Solana (${SOLANA_CHAIN_ID}) as an allowed origin...`);
  
  const tx = await timeCapsuleReceiver.setAllowedOrigin(SOLANA_CHAIN_ID, true);
  await tx.wait();
  
  console.log(`Solana origin allowed successfully!`);
  
  // Set base URI for metadata (example)
  const baseURI = "https://time-capsule-metadata.example.com/token/";
  
  console.log(`Setting base URI to: ${baseURI}`);
  
  const txURI = await timeCapsuleReceiver.setBaseURI(baseURI);
  await txURI.wait();
  
  console.log(`Base URI set successfully!`);
  
  console.log("Deployment completed successfully!");
  console.log("====================================");
  console.log(`Contract: ${timeCapsuleReceiver.address}`);
  console.log(`Network: ${network}`);
  console.log(`LayerZero Endpoint: ${layerZeroEndpoint}`);
  console.log("====================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
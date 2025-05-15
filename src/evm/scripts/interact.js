const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Get network and contract info
  const network = process.env.HARDHAT_NETWORK || "hardhat";
  const contractAddress = process.env.TIME_CAPSULE_RECEIVER_ADDRESS;

  if (!contractAddress) {
    console.error("TIME_CAPSULE_RECEIVER_ADDRESS not set in .env file");
    process.exit(1);
  }

  console.log(`Interacting with TimeCapsuleReceiver at ${contractAddress} on ${network}`);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);

  // Get contract
  const TimeCapsuleReceiver = await ethers.getContractFactory("TimeCapsuleReceiver");
  const timeCapsuleReceiver = await TimeCapsuleReceiver.attach(contractAddress);

  // Get all capsule releases events
  console.log("Getting all capsule release events...");

  const filter = timeCapsuleReceiver.filters.CapsuleReceived();
  const events = await timeCapsuleReceiver.queryFilter(filter);

  console.log(`Found ${events.length} capsule release events`);

  // Print details of each event
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const { tokenId, owner, unlockedAt, capsuleType } = event.args;

    const capsuleTypeNames = ["Text", "Token", "NFT"];
    const capsuleTypeName = capsuleTypeNames[capsuleType];

    console.log(`\nCapsule #${tokenId.toString()}:`);
    console.log(`- Owner: ${owner}`);
    console.log(`- Unlocked at: ${new Date(unlockedAt.toNumber() * 1000).toLocaleString()}`);
    console.log(`- Type: ${capsuleTypeName}`);

    // Get additional data from the release info
    const releaseInfo = await timeCapsuleReceiver.getReleaseInfo(tokenId);
    console.log(`- Created at: ${new Date(releaseInfo.createdAt.toNumber() * 1000).toLocaleString()}`);
    
    if (capsuleType.toString() === "0") { // Text
      console.log(`- Content: ${releaseInfo.content}`);
    }
  }
}

// Function to set allowed origin chains
async function setAllowedOrigin(chainId, allowed) {
  const contractAddress = process.env.TIME_CAPSULE_RECEIVER_ADDRESS;
  if (!contractAddress) {
    console.error("TIME_CAPSULE_RECEIVER_ADDRESS not set in .env file");
    process.exit(1);
  }

  console.log(`Setting chain ${chainId} as ${allowed ? "allowed" : "disallowed"}...`);

  // Get contract
  const TimeCapsuleReceiver = await ethers.getContractFactory("TimeCapsuleReceiver");
  const timeCapsuleReceiver = await TimeCapsuleReceiver.attach(contractAddress);

  // Set allowed origin
  const tx = await timeCapsuleReceiver.setAllowedOrigin(chainId, allowed);
  await tx.wait();

  console.log(`Origin chain ${chainId} is now ${allowed ? "allowed" : "disallowed"}`);
}

// Function to set base URI
async function setBaseURI(baseURI) {
  const contractAddress = process.env.TIME_CAPSULE_RECEIVER_ADDRESS;
  if (!contractAddress) {
    console.error("TIME_CAPSULE_RECEIVER_ADDRESS not set in .env file");
    process.exit(1);
  }

  console.log(`Setting base URI to: ${baseURI}`);

  // Get contract
  const TimeCapsuleReceiver = await ethers.getContractFactory("TimeCapsuleReceiver");
  const timeCapsuleReceiver = await TimeCapsuleReceiver.attach(contractAddress);

  // Set base URI
  const tx = await timeCapsuleReceiver.setBaseURI(baseURI);
  await tx.wait();

  console.log(`Base URI set successfully!`);
}

// Export functions to allow them to be called via command line arguments
module.exports = {
  showReleases: main,
  setAllowedOrigin,
  setBaseURI
};

// Run main if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} 
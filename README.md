# Omnichain Time Capsule DApp

This project allows users to lock NFTs, tokens, or text messages inside a 'Time Capsule' on Solana, which can be unlocked at a future date. Upon unlocking, a LayerZero V2 message is sent to a destination chain to mint a 'Released' NFT or perform a corresponding action.

## Current Demo Status

The project is now set up in **demo mode** with the following features working:

1. Frontend UI with Solana wallet connection
2. Create Time Capsule with text messages (mocked implementation)
3. View Time Capsules and unlock them (mocked implementation)

## Project Overview

The Omnichain Time Capsule implements:

1. **Solana Program** - for creating and unlocking time capsules
2. **EVM Smart Contract** - for receiving unlock notifications and minting NFTs
3. **LayerZero V2 Messaging** - connecting both chains securely

## Project Structure

```
solana-brkout/
├── src/
│   ├── solana/             # Solana program code
│   │   ├── program/        # Rust code for Solana program  
│   │   └── client/         # JavaScript client for interacting with Solana program
│   │
│   └── evm/                # EVM smart contracts
│       ├── contracts/      # Solidity smart contracts
│       └── scripts/        # Deployment and testing scripts
│
├── frontend/              # React frontend application
│   ├── public/
│   └── src/
│
└── README.md              # Project documentation
```

## Prerequisites

- Node.js (v16 or later)
- Rust and Cargo (for Solana program development)
- Solana CLI tools
- Phantom Wallet or other Solana wallet
- Metamask or other EVM wallet

## Demo Quick Start

```
# Clone the repository
git clone <repository-url>
cd solana-brkout

# Install main dependencies
npm install --legacy-peer-deps

# Install frontend dependencies
cd frontend
npm install --legacy-peer-deps

# Start the frontend demo
npm start
```

The application will open in your browser at http://localhost:3000.

## Run in Production Mode

For a production deployment, you'd need to:

1. Build and deploy the Solana program
2. Deploy the EVM smart contract 
3. Configure the frontend with the deployed contract addresses
4. Build and serve the frontend

```bash
# Build the Solana program
cd src/solana/program
cargo build-bpf

# Deploy the Solana program
solana program deploy target/deploy/time_capsule.so

# Deploy the EVM contract
cd ../../evm
npx hardhat run scripts/deploy.js --network sepolia

# Build the frontend
cd ../../frontend
npm run build
```

## Usage Instructions

1. **Connect Wallet**: Connect your Phantom wallet to the application.

2. **Create Time Capsule**: 
   - Enter a message
   - Set a future date for unlocking
   - Select a destination chain
   - Provide the destination contract address (TimeCapsuleReceiver contract address)
   - Click "Create Time Capsule"

3. **View Time Capsules**:
   - See all your created time capsules
   - Check their status (locked/unlocked)
   - Unlock capsules when they're ready

4. **View Released NFTs**:
   - After unlocking, check your EVM wallet for the newly minted NFT
   - The NFT represents your unlocked time capsule

## Development Notes

### Solana Program

The Solana program is built using the Anchor framework. It manages time capsules, which can contain text messages or tokens. When a capsule is unlocked, it sends a message via LayerZero V2 to the destination chain.

### EVM Contract

The EVM contract receives messages from Solana via LayerZero V2 and mints NFTs to represent the unlocked time capsules. It includes metadata about the capsule, such as when it was created and unlocked.

### LayerZero Integration

The project uses LayerZero V2 for cross-chain messaging. It's currently set up to work between Solana and Ethereum Sepolia/Arbitrum Sepolia, but can be configured for other chains as well.

## LayerZero Resources

- [LayerZero V2 Documentation](https://docs.layerzero.network/v2)
- [LayerZero V2 Solana Example](https://github.com/LayerZero-Labs/devtools/tree/main/examples/oft-solana)
- [Deployed Contracts](https://docs.layerzero.network/v2/deployments/deployed-contracts)
- [LayerZeroScan Explorer](https://layerzeroscan.com/)

## License

MIT
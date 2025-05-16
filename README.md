# Omnichain Time Capsule DApp

A cross-chain application that allows you to lock messages, tokens, or NFTs inside a "Time Capsule" on Solana, which can be unlocked at a future date. When unlocked, a LayerZero V2 message is sent to a destination chain to mint a "Released" NFT.

This project is a submission for the LayerZero Solana Breakout Bounty.

## Architecture

### Solana Program
- Lock NFTs, tokens, or text messages into a Time Capsule
- Store a `releaseTimestamp` alongside the asset/message
- When unlocked, sends a LayerZero V2 message to a destination chain

### EVM Smart Contract
- Receives messages from Solana via LayerZero V2
- Mints a "Time Capsule Released" NFT (ERC721) with the original contents

### Frontend
- React-based UI to interact with both chains
- Connect Solana wallet (Phantom) and EVM wallet (MetaMask)
- Create and unlock time capsules
- View time capsules and their status

## Deployment Instructions

### 1. Deploy the Solana Program

```bash
cd src/solana
anchor build
anchor deploy --provider.cluster devnet
```

After deployment, update the `SOLANA_PROGRAM_ID` in `frontend/src/env-config.js` with your deployed program ID.

### 2. Deploy the EVM Contract

First, set up your .env file in the `src/evm` directory:

```
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=your_sepolia_rpc_url
ARBITRUM_SEPOLIA_RPC_URL=your_arbitrum_sepolia_rpc_url
ETHERSCAN_API_KEY=your_etherscan_api_key
```

Then deploy the contracts:

```bash
cd src/evm

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Arbitrum Sepolia
npx hardhat run scripts/deploy.js --network arbitrumSepolia
```

After deployment, update the `DESTINATION_ADDRESSES` in `frontend/src/env-config.js` with your deployed contract addresses.

### 3. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

## How to Use

1. **Connect your wallets**:
   - Connect Phantom wallet for Solana
   - Connect MetaMask wallet for EVM chains (Sepolia or Arbitrum Sepolia)

2. **Create a Time Capsule**:
   - Enter a message
   - Select an unlock date
   - Choose a destination chain (Sepolia or Arbitrum Sepolia)
   - Click "Create Time Capsule"

3. **Unlock a Time Capsule**:
   - Go to "My Capsules"
   - Find a capsule that has reached its unlock date
   - Click "Unlock"
   - This will send a LayerZero message to the destination chain
   - An NFT will be minted on the destination chain

4. **View Your NFTs**:
   - Connect to the destination chain in MetaMask
   - The NFT will appear in your wallet

## Troubleshooting

### LayerZero Message Not Showing Up

If your LayerZero message doesn't appear on the destination chain:

1. Check that your Solana transaction was successful on [Solana Explorer](https://explorer.solana.com/?cluster=devnet)
2. Verify the LayerZero message on [LayerZero Scan](https://layerzeroscan.com/)
3. Make sure your destination chain contract is set up with the correct origin chain ID (40228 for Solana Devnet)
4. Verify your wallet addresses are correct in both chains

### Connection Issues

If you experience RPC connection issues:

1. The frontend has built-in fallback to multiple RPC providers
2. You can update the RPC endpoints in `frontend/src/env-config.js`

## Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request

## License

This project is licensed under the MIT License.
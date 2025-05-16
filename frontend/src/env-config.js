// Environment configuration values
export const SOLANA_RPC_URL = "https://api.devnet.solana.com";
export const SOLANA_PROGRAM_ID = "428gGmLitQZZHuz6SFW9TycS4b9JsULpB3yM4Wi6Jvos";

// Alternative RPC endpoints
export const SOLANA_RPC_ENDPOINTS = [
  "https://api.devnet.solana.com",
  "https://devnet.genesysgo.net",
  "https://rpc-devnet.epochs.studio",
  "https://mango.devnet.rpcpool.com",
  "https://devnet.rpcpool.com"
];

// Default connection config
export const CONNECTION_CONFIG = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  disableRetryOnRateLimit: false,
  wsEndpoint: "wss://api.devnet.solana.com/"
};

// LayerZero V2 chain IDs
// Source: https://docs.layerzero.network/v2/developers/eids
export const CHAIN_IDS = {
  'sepolia': 40161,        // Ethereum Sepolia testnet
  'arbitrum-sepolia': 40231,  // Arbitrum Sepolia testnet
  'solana-devnet': 40228    // Solana Devnet
};

// EVM destination contract addresses
// These should be updated after deployment
export const DESTINATION_ADDRESSES = {
  'sepolia': "0xFD89bF8cd65eCe400D814B3aB540c362e0A79BAa",      // Your Sepolia contract
  'arbitrum-sepolia': "0xFD89bF8cd65eCe400D814B3aB540c362e0A79BAa"  // Your Arbitrum contract
};

// LayerZero V2 endpoint addresses
// Source: https://docs.layerzero.network/v2/developers/deployment/endpoints
export const LAYERZERO_ENDPOINTS = {
  // This should be the base58 encoded Solana public key for the LayerZero Solana endpoint on devnet
  'solana': "BLZrFGHLJHrj4upMYozKxY3d3xEgKqEAtW9FH4fX7uJa",  // LayerZero V2 Solana Devnet endpoint
  'sepolia': "0x6EDCE65403992e310A62460808c4b910D972f10f",   // LayerZero V2 Sepolia endpoint
  'arbitrum-sepolia': "0x6098e96a28E02f27B1e6BD381f870F1C8Bd169d3" // LayerZero V2 Arbitrum Sepolia endpoint
};

// User wallet addresses
export const USER_ADDRESSES = {
  'evm': "0xBFAbb5a94b91E6B32e81ea17b7CEE198cB67c02e",    // MetaMask wallet
  'solana': "Eki9dVQdcjxcDL1YdMfkr43RMfkE4wQWzAt8bXh5QadQ"  // Solana wallet
};

export const SKIP_PREFLIGHT_CHECK = true;
export const NODE_ENV = 'development';

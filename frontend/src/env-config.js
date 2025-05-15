// Environment configuration values
export const SOLANA_RPC_URL = "https://api.devnet.solana.com";
export const SKIP_PREFLIGHT_CHECK = true;
export const NODE_ENV = 'development';

// Set these values on the window object for global access
if (typeof window !== 'undefined') {
  window.ENV = {
    SOLANA_RPC_URL,
    SKIP_PREFLIGHT_CHECK,
    NODE_ENV,
  };
}

// Blockchain Network Configuration
export const SOLANA_PROGRAM_ID = "428gGmLitQZZHuz6SFW9TycS4b9JsULpB3yM4Wi6Jvos"; // Actual deployed program ID

// EVM Configuration
export const EVM_CHAIN_ID = 11155111; // Sepolia Chain ID (use 421614 for Arbitrum Sepolia)
export const EVM_RPC_URL = "https://rpc.sepolia.org"; // Or Arbitrum Sepolia URL if using that
export const TIME_CAPSULE_RECEIVER_ADDRESS = "0x598C4Fb5aEb0F2965782a73c40972eCb8056E7FA"; // Actual deployed EVM address

// LayerZero Configuration
export const SOLANA_LAYER_ZERO_CHAIN_ID = 168;
export const EVM_LAYER_ZERO_CHAIN_ID = 10161; // 10161 for Sepolia, 10231 for Arbitrum Sepolia

// Destination chains for the frontend dropdown
export const DESTINATION_CHAINS = [
  { 
    id: 10161, 
    name: "Ethereum Sepolia", 
    layerZeroId: 10161,
    icon: "ethereum.svg"
  },
  { 
    id: 10231, 
    name: "Arbitrum Sepolia", 
    layerZeroId: 10231,
    icon: "arbitrum.svg"
  }
];

export default {
  SOLANA_RPC_URL,
  SKIP_PREFLIGHT_CHECK,
  NODE_ENV,
  SOLANA_PROGRAM_ID,
  EVM_CHAIN_ID,
  EVM_RPC_URL,
  TIME_CAPSULE_RECEIVER_ADDRESS,
  SOLANA_LAYER_ZERO_CHAIN_ID,
  EVM_LAYER_ZERO_CHAIN_ID,
}; 
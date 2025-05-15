import { PublicKey, Connection } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { SOLANA_PROGRAM_ID } from '../env-config';

// Constants
const PROGRAM_ID = new PublicKey(SOLANA_PROGRAM_ID); // Use the deployed program ID from env-config
const TIME_CAPSULE_MANAGER_SEED = 'manager';

export class TimeCapsuleClient {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.program = null;
  }

  async init() {
    const provider = new anchor.AnchorProvider(
      this.connection,
      this.wallet,
      { commitment: 'confirmed' }
    );
    
    // Use a simplified IDL for demo purposes
    const IDL = {
      version: "0.1.0",
      name: "time_capsule",
      instructions: [],
      accounts: [],
    };
    
    // Load the program
    try {
      this.program = new anchor.Program(IDL, PROGRAM_ID, provider);
    } catch (err) {
      console.error('Failed to load program:', err);
      throw err;
    }

    return this;
  }

  async createTextCapsule(message, releaseTimestamp, destinationChainId, destinationAddress) {
    // This is a mock implementation for demonstration
    console.log('Creating text capsule with params:', {
      message,
      releaseTimestamp,
      destinationChainId,
      destinationAddress
    });
    
    // In a real implementation, this would call the Solana program
    return "tx_hash_placeholder";
  }

  async getAllCapsules() {
    // This is a mock implementation that returns sample data
    return [
      {
        publicKey: new PublicKey('11111111111111111111111111111111'),
        account: {
          owner: this.wallet.publicKey,
          capsuleType: { toString: () => '0' }, // Text type
          releaseTimestamp: { toNumber: () => Math.floor(Date.now() / 1000) + 3600 }, // 1 hour from now
          createdAt: { toNumber: () => Math.floor(Date.now() / 1000) - 3600 }, // 1 hour ago
          isUnlocked: false,
          content: "This is a sample time capsule message for demonstration purposes.",
          destinationChainId: 10161 // Ethereum Sepolia
        }
      },
      {
        publicKey: new PublicKey('22222222222222222222222222222222'),
        account: {
          owner: this.wallet.publicKey,
          capsuleType: { toString: () => '0' }, // Text type
          releaseTimestamp: { toNumber: () => Math.floor(Date.now() / 1000) - 1800 }, // 30 minutes ago (unlockable)
          createdAt: { toNumber: () => Math.floor(Date.now() / 1000) - 7200 }, // 2 hours ago
          isUnlocked: false,
          content: "This capsule is ready to be unlocked!",
          destinationChainId: 10231 // Arbitrum Sepolia
        }
      }
    ];
  }

  async unlockCapsule(capsuleAddress, tokenMint = null) {
    // This is a mock implementation for demonstration
    console.log('Unlocking capsule:', capsuleAddress.toString());
    
    // In a real implementation, this would call the Solana program
    return "unlock_tx_hash_placeholder";
  }
}

export const PROGRAM_ID_STRING = PROGRAM_ID.toString(); 
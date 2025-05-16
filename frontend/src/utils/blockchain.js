import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { SOLANA_RPC_URL, SOLANA_PROGRAM_ID, CHAIN_IDS, DESTINATION_ADDRESSES, SOLANA_RPC_ENDPOINTS, CONNECTION_CONFIG, LAYERZERO_ENDPOINTS } from '../env-config';
import * as bs58 from 'bs58';

// Program ID from your deployed contract
const programId = new PublicKey(SOLANA_PROGRAM_ID);

// Convert hex address to base58 PublicKey
const hexToPublicKey = (hexAddress) => {
  // Remove '0x' prefix if present and ensure the string is the correct length
  const cleanHex = hexAddress.replace('0x', '').padStart(64, '0');
  // Convert hex to Uint8Array
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, (i + 1) * 2), 16);
  }
  return new PublicKey(bytes);
};

// LayerZero endpoint for Solana
// If the endpoint is already in base58 format (not starting with 0x), use it directly
const LAYERZERO_ENDPOINT = LAYERZERO_ENDPOINTS.solana.startsWith('0x') 
  ? hexToPublicKey(LAYERZERO_ENDPOINTS.solana)
  : new PublicKey(LAYERZERO_ENDPOINTS.solana);

console.log("Using LayerZero Endpoint:", LAYERZERO_ENDPOINT.toBase58());

// Basic IDL matching your program structure
const IDL = {
  version: "0.1.0",
  name: "time_capsule",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "timeCapsuleManager", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: []
    },
    {
      name: "createTextCapsule",
      accounts: [
        { name: "timeCapsuleManager", isMut: true, isSigner: false },
        { name: "timeCapsule", isMut: true, isSigner: false },
        { name: "payer", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "message", type: "string" },
        { name: "releaseTimestamp", type: "i64" },
        { name: "destinationChainId", type: "u16" },
        { name: "destinationAddress", type: { array: ["u8", 32] } }
      ]
    },
    {
      name: "createTokenCapsule",
      accounts: [
        { name: "timeCapsuleManager", isMut: true, isSigner: false },
        { name: "timeCapsule", isMut: true, isSigner: false },
        { name: "payer", isMut: true, isSigner: true },
        { name: "mint", isMut: false, isSigner: false },
        { name: "sourceTokenAccount", isMut: true, isSigner: false },
        { name: "capsuleTokenAccount", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false }
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "releaseTimestamp", type: "i64" },
        { name: "destinationChainId", type: "u16" },
        { name: "destinationAddress", type: { array: ["u8", 32] } }
      ]
    },
    {
      name: "unlockCapsule",
      accounts: [
        { name: "timeCapsule", isMut: true, isSigner: false },
        { name: "payer", isMut: true, isSigner: true },
        { name: "capsuleTokenAccount", isMut: true, isSigner: false, optional: true },
        { name: "destinationTokenAccount", isMut: true, isSigner: false, optional: true },
        { name: "tokenProgram", isMut: false, isSigner: false, optional: true },
        { name: "layerzeroEndpoint", isMut: false, isSigner: false, optional: true },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false }
      ],
      args: []
    }
  ],
  accounts: [
    {
      name: "timeCapsuleManager",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "capsuleCount", type: "u64" }
        ]
      }
    },
    {
      name: "timeCapsule",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "publicKey" },
          { name: "capsuleType", type: { defined: "CapsuleType" } },
          { name: "releaseTimestamp", type: "i64" },
          { name: "createdAt", type: "i64" },
          { name: "isUnlocked", type: "bool" },
          { name: "unlockedAt", type: { option: "i64" } },
          { name: "content", type: "string" },
          { name: "tokenMint", type: { option: "publicKey" } },
          { name: "tokenAmount", type: { option: "u64" } },
          { name: "destinationChainId", type: "u16" },
          { name: "destinationAddress", type: { array: ["u8", 32] } }
        ]
      }
    }
  ],
  types: [
    {
      name: "CapsuleType",
      type: {
        kind: "enum",
        variants: [
          { name: "Text" },
          { name: "Token" },
          { name: "NFT" }
        ]
      }
    }
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidReleaseTime",
      msg: "Release timestamp must be in the future"
    },
    {
      code: 6001,
      name: "CapsuleAlreadyUnlocked",
      msg: "Capsule is already unlocked"
    },
    {
      code: 6002,
      name: "CapsuleNotReadyForUnlock",
      msg: "Capsule is not ready to be unlocked yet"
    },
    {
      code: 6003,
      name: "NotCapsuleOwner",
      msg: "Only the capsule owner can unlock it"
    }
  ]
};

// Seeds for PDAs
const MANAGER_SEED = 'manager';
const TIME_CAPSULE_SEED = 'time_capsule';

// Convert hex address to Uint8Array
const hexToBytes = (hex) => {
  const bytes = new Uint8Array(32);
  const hexWithoutPrefix = hex.startsWith('0x') ? hex.slice(2) : hex;
  for (let i = 0; i < Math.min(32, hexWithoutPrefix.length / 2); i++) {
    bytes[i] = parseInt(hexWithoutPrefix.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

// Get a reliable connection with fallback
const getReliableConnection = () => {
  // Try each endpoint in order until one works
  let lastError = null;
  let connection = null;
  
  // Helper function to test connection
  const testConnection = async (endpoint) => {
    try {
      const conn = new Connection(endpoint, CONNECTION_CONFIG);
      // Try to get a recent blockhash to test the connection
      await conn.getLatestBlockhash();
      return conn;
    } catch (err) {
      console.warn(`RPC endpoint ${endpoint} failed:`, err.message);
      return null;
    }
  };

  // First try the primary endpoint
  connection = new Connection(SOLANA_RPC_URL, CONNECTION_CONFIG);
  
  // If primary fails, try alternatives
  if (!connection) {
    for (const endpoint of SOLANA_RPC_ENDPOINTS) {
      try {
        connection = new Connection(endpoint, {
          ...CONNECTION_CONFIG,
          wsEndpoint: endpoint.replace('https://', 'wss://')
        });
        break;
      } catch (err) {
        console.warn(`RPC endpoint ${endpoint} failed, trying next`);
        lastError = err;
      }
    }
  }
  
  // If all fail, throw the last error
  if (!connection) {
    throw lastError || new Error('All RPC endpoints failed');
  }
  
  return connection;
};

// Get program instance with reliable connection
const getProgram = (wallet) => {
  const connection = getReliableConnection();
  
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    {
      ...CONNECTION_CONFIG,
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
      skipPreflight: true // Add this to help with timeout issues
    }
  );
  
  return new anchor.Program(IDL, programId, provider);
};

// Get PDA addresses
const getManagerAddress = async () => {
  const [managerAddress] = await PublicKey.findProgramAddress(
    [Buffer.from(MANAGER_SEED)],
    programId
  );
  return managerAddress;
};

const getTimeCapsuleAddress = async (owner, capsuleCount) => {
  const [capsuleAddress] = await PublicKey.findProgramAddress(
    [
      Buffer.from(TIME_CAPSULE_SEED),
      owner.toBuffer(),
      new anchor.BN(capsuleCount).toArrayLike(Buffer, 'le', 8)
    ],
    programId
  );
  return capsuleAddress;
};

// This is what's actually used in the Solana program's struct definition
// seeds = [b"time_capsule", payer.key().as_ref()]
const getSimpleTimeCapsuleAddress = async (owner) => {
  const [capsuleAddress] = await PublicKey.findProgramAddress(
    [
      Buffer.from(TIME_CAPSULE_SEED),
      owner.toBuffer()
    ],
    programId
  );
  return capsuleAddress;
};

// Initialize the TimeCapsuleManager if it doesn't exist
const initializeManager = async (program, wallet) => {
  try {
    const managerAddress = await getManagerAddress();
    
    console.log('Initializing with manager address:', managerAddress.toBase58());
    
    // Use the same transaction building approach for consistency
    const tx = await program.methods
      .initialize()
      .accounts({
        timeCapsuleManager: managerAddress,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
      
    // Sign and send with manual handling
    const connection = program.provider.connection;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(tx);
    
    // Send with retry
    const txId = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      maxRetries: 5,
      preflightCommitment: 'confirmed'
    });
    
    // Wait for confirmation using a more robust method
    await connection.confirmTransaction({
      signature: txId,
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight
    }, 'confirmed');
    
    console.log('TimeCapsuleManager initialized:', txId);
    return true;
  } catch (error) {
    console.error('Error initializing manager:', error);
    throw error; // Propagate the error for better debugging
  }
};

// Helper function to wait for account creation
const waitForAccount = async (program, accountAddress, maxRetries = 5, delayMs = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const account = await program.account.timeCapsuleManager.fetch(accountAddress);
      return account;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

// Helper function to try to extract data from raw account data
const extractCapsuleData = (accountData, capsuleAddress, ownerPublicKey) => {
  try {
    // Skip account discriminator (8 bytes) and owner pubkey (32 bytes)
    const dataWithoutHeader = accountData.slice(40);
    
    // Create a DataView for reliable binary data reading
    const dataView = new DataView(dataWithoutHeader.buffer, dataWithoutHeader.byteOffset);
    
    // Read the capsule type (1 byte)
    const capsuleType = dataView.getUint8(0);
    
    // Read the release timestamp as a 64-bit integer (8 bytes)
    const releaseTimestamp = dataView.getBigInt64(1, true); // true for little-endian
    
    // Read created timestamp
    const createdTimestamp = dataView.getBigInt64(9, true);
    
    // Read isUnlocked flag
    const isUnlocked = dataView.getUint8(17) !== 0;
    
    // Convert to milliseconds and create a Date
    const timestampMs = Number(releaseTimestamp) * 1000;
    const date = new Date(timestampMs);
    
    // Validate the date
    const unlockDate = (isNaN(date) || date.getFullYear() > 2100 || date.getFullYear() < 2000) 
      ? new Date().toISOString() // Fallback to current date if invalid
      : date.toISOString();
    
    // Extract content string if possible (variable length)
    // First 4 bytes after the fixed fields should be the string length
    const contentLength = dataView.getUint32(18, true); // true for little-endian
    
    // Make sure content length is reasonable (prevent buffer overruns)
    const maxPossibleLength = dataWithoutHeader.length - 22; // Fixed fields + string length
    const validContentLength = Math.min(contentLength, maxPossibleLength);
    
    // Extract the string content
    let content = "";
    
    if (validContentLength > 0 && validContentLength <= maxPossibleLength) {
      try {
        const contentBytes = dataWithoutHeader.slice(22, 22 + validContentLength);
        // Only show content if capsule is unlocked
        if (isUnlocked) {
          try {
            content = new TextDecoder("utf-8", {fatal: true}).decode(contentBytes);
          } catch (e) {
            content = "Message (decoding error)";
          }
        } else {
          content = "🔒 Message locked";
        }
      } catch (e) {
        console.log("Error decoding message content:", e);
        content = isUnlocked ? "Message (decoding error)" : "🔒 Message locked";
      }
    } else if (validContentLength === 0) {
      content = isUnlocked ? "Empty message" : "🔒 Empty message";
    } else {
      content = isUnlocked ? "Message (invalid length)" : "🔒 Message locked";
    }
    
    // Extract destination chain ID (u16, 2 bytes) from the end
    const chainIdOffset = dataWithoutHeader.length - 34; // 32 bytes for address + 2 for chain ID
    let destinationChainId = 0;
    if (chainIdOffset >= 0) {
      destinationChainId = dataView.getUint16(chainIdOffset, true);
    }
    
    // Determine destination chain from ID
    let destinationChain = "unknown";
    if (destinationChainId === CHAIN_IDS.sepolia) {
      destinationChain = "sepolia";
    } else if (destinationChainId === CHAIN_IDS["arbitrum-sepolia"]) {
      destinationChain = "arbitrum-sepolia";
    }
    
    return {
      id: capsuleAddress,
      message: content,
      unlockDate: unlockDate,
      destinationChain,
      isUnlocked,
      isErrorState: false
    };
  } catch (err) {
    console.log("Error in manual data extraction:", err);
    return {
      id: capsuleAddress,
      message: "🔒 Message locked (error)",
      unlockDate: new Date().toISOString(),
      destinationChain: "unknown",
      isUnlocked: false,
      isErrorState: true
    };
  }
};

export const createTimeCapsule = async (wallet, message, unlockDate, destinationChain) => {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  try {
    // Let's do some diagnostics to find out why capsules aren't showing up
    console.log("=== PDA DIAGNOSTICS ===");
    const simpleAddress = await getSimpleTimeCapsuleAddress(wallet.publicKey);
    console.log("Simple PDA address:", simpleAddress.toBase58());
    
    const program = getProgram(wallet);
    const managerAddress = await getManagerAddress();
    console.log('Manager address:', managerAddress.toBase58());

    // Check if manager exists and initialize if it doesn't
    let managerAccount;
    try {
      managerAccount = await program.account.timeCapsuleManager.fetch(managerAddress);
      console.log('Manager account exists with capsule count:', managerAccount.capsuleCount.toString());
    } catch (e) {
      console.log('Manager account not found, initializing...');
      await initializeManager(program, wallet);
      console.log('Manager initialized, waiting for confirmation...');
      
      // Wait for the account to be available
      managerAccount = await waitForAccount(program, managerAddress);
      console.log('Manager account confirmed and available');
    }

    // Always use indexed capsule addresses to allow multiple capsules per user
    const capsuleCount = managerAccount.capsuleCount.toNumber();
    const capsuleAddress = await getTimeCapsuleAddress(wallet.publicKey, capsuleCount);
    console.log('Creating capsule at address (using indexed PDA):', capsuleAddress.toBase58());

    // Get proper chain ID and destination address
    const destinationChainId = CHAIN_IDS[destinationChain];
    if (!destinationChainId) {
      throw new Error(`Invalid destination chain: ${destinationChain}`);
    }
    console.log(`Using destination chain ID: ${destinationChainId} for ${destinationChain}`);

    const destinationContractAddress = DESTINATION_ADDRESSES[destinationChain];
    if (!destinationContractAddress) {
      throw new Error(`Destination contract address not found for ${destinationChain}`);
    }
    console.log(`Using destination contract address: ${destinationContractAddress}`);

    // Convert destination address to bytes - for LayerZero V2, this needs to be a 32-byte value
    const destinationAddress = hexToBytes(destinationContractAddress);
    console.log('Converted destination address to bytes:', Array.from(destinationAddress));

    // Create the capsule - ensure timestamp is an integer
    const releaseTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);
    console.log('Creating capsule with release timestamp:', releaseTimestamp);
    console.log('Creating capsule with message:', message);
    
    // Try with manual transaction building which is more reliable
    const tx = await program.methods
      .createTextCapsule(
        message,
        new anchor.BN(releaseTimestamp),
        destinationChainId,
        Array.from(destinationAddress)
      )
      .accounts({
        timeCapsuleManager: managerAddress,
        timeCapsule: capsuleAddress,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
      
    // Sign and send with manual handling
    const connection = program.provider.connection;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(tx);
    
    // Send with retry
    const txId = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      maxRetries: 5,
      preflightCommitment: 'confirmed'
    });
    
    // Wait for confirmation using a more robust method
    await connection.confirmTransaction({
      signature: txId,
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight
    }, 'confirmed');
    
    console.log('Capsule created successfully:', txId);
    console.log('Capsule address:', capsuleAddress.toBase58());
    
    // Verify capsule was created
    try {
      const createdCapsule = await program.account.timeCapsule.fetch(capsuleAddress);
      console.log('Successfully verified capsule creation:', createdCapsule);
    } catch (verifyError) {
      console.log('Warning: Could not verify capsule creation:', verifyError);
    }
    
    // Show instructions for checking on Solana explorer
    console.log(`Check your transaction on Solana Explorer: https://explorer.solana.com/tx/${txId}?cluster=devnet`);
    
    return {
      transactionId: txId,
      capsuleAddress: capsuleAddress.toBase58(),
      releaseTimestamp,
      message,
      destinationChain,
      destinationChainId,
      destinationAddress: destinationContractAddress
    };
  } catch (error) {
    console.error('Error creating time capsule:', error);
    throw error;
  }
};

// Function to create a time capsule with a specific indexed address
const createIndexedTimeCapsule = async (wallet, message, unlockDate, destinationChain, capsuleAddress, managerAddress) => {
  try {
    const program = getProgram(wallet);
    const connection = program.provider.connection;
    
    // Get proper chain ID and destination address
    const destinationChainId = CHAIN_IDS[destinationChain];
    if (!destinationChainId) {
      throw new Error(`Invalid destination chain: ${destinationChain}`);
    }
    
    const destinationContractAddress = DESTINATION_ADDRESSES[destinationChain];
    if (!destinationContractAddress) {
      throw new Error(`Destination contract address not found for ${destinationChain}`);
    }
    
    // Convert destination address to bytes
    const destinationAddress = hexToBytes(destinationContractAddress);
    
    // Create the capsule - ensure timestamp is an integer
    const releaseTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);
    
    // Try with manual transaction building which is more reliable
    const tx = await program.methods
      .createTextCapsule(
        message,
        new anchor.BN(releaseTimestamp),
        destinationChainId,
        Array.from(destinationAddress)
      )
      .accounts({
        timeCapsuleManager: managerAddress,
        timeCapsule: capsuleAddress,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
      
    // Sign and send with manual handling
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(tx);
    
    // Send with retry
    const txId = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      maxRetries: 5,
      preflightCommitment: 'confirmed'
    });
    
    // Wait for confirmation using a more robust method
    await connection.confirmTransaction({
      signature: txId,
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight
    }, 'confirmed');
    
    console.log('Indexed capsule created successfully:', txId);
    console.log('Capsule address:', capsuleAddress.toBase58());
    
    return {
      transactionId: txId,
      capsuleAddress: capsuleAddress.toBase58(),
      releaseTimestamp,
      message,
      destinationChain,
      destinationChainId,
      destinationAddress: destinationContractAddress
    };
  } catch (error) {
    console.error('Error creating indexed time capsule:', error);
    throw error;
  }
};

export const fetchUserCapsules = async (wallet) => {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  try {
    console.log('Starting to fetch capsules for wallet:', wallet.publicKey.toString());
    
    // Get the simple address to check
    const simpleCapsuleAddress = await getSimpleTimeCapsuleAddress(wallet.publicKey);
    console.log('Simple PDA address (checking first):', simpleCapsuleAddress.toBase58());
    
    const program = getProgram(wallet);
    const connection = program.provider.connection;
    
    // Get the TimeCapsuleManager account
    const managerAddress = await getManagerAddress();
    console.log('Manager address:', managerAddress.toBase58());
    
    const capsules = [];
    
    // First try to find a capsule using the simple PDA format (without capsule count)
    // We're moving this up because this is the most important one to check first
    console.log('Checking for simple PDA format capsule first');
    try {
      const accountInfo = await connection.getAccountInfo(simpleCapsuleAddress);
      if (accountInfo) {
        console.log('Found account using simple PDA format 🎉');
        console.log('Account data:', accountInfo);
        
        try {
          const capsuleAccount = await program.account.timeCapsule.fetch(simpleCapsuleAddress);
          console.log('Successfully decoded simple PDA capsule:', capsuleAccount);
          
          // Check if the owner matches
          if (capsuleAccount.owner.toString() === wallet.publicKey.toString()) {
            console.log('Owner matches for simple PDA capsule');
            
            capsules.push({
              id: simpleCapsuleAddress.toBase58(),
              message: capsuleAccount.content,
              unlockDate: new Date(capsuleAccount.releaseTimestamp.toNumber() * 1000).toISOString(),
              destinationChain: capsuleAccount.destinationChainId === CHAIN_IDS.sepolia ? 'sepolia' : 'arbitrum-sepolia',
              isUnlocked: capsuleAccount.isUnlocked
            });
          } else {
            console.log('Owner does not match for simple PDA capsule:', capsuleAccount.owner.toString());
          }
        } catch (decodeErr) {
          console.log('Failed to decode simple PDA capsule:', decodeErr.message);
          
          // Continue with manual decoding...
        }
      } else {
        console.log('No account found using simple PDA format');
      }
    } catch (simplePdaErr) {
      console.log('Error checking simple PDA format:', simplePdaErr.message);
    }
    
    // Try the legacy format with counts
    try {
      const managerAccount = await program.account.timeCapsuleManager.fetch(managerAddress);
      console.log('Manager account fetched:', managerAccount);
      
      // If no capsules exist, try searching for the simple PDA format
      if (managerAccount.capsuleCount.toNumber() === 0) {
        console.log('No capsules found in manager');
      } else {
        // Try to get all capsules based on the count from manager (legacy format)
        // Add a larger buffer to the count to make sure we check for any indexed capsules too
        const capsuleCount = managerAccount.capsuleCount.toNumber() + 10; 
        console.log('Total capsule count + buffer:', capsuleCount);
      
        // Loop through all possible capsule indexes using the original PDA format
        for (let i = 0; i < capsuleCount; i++) {
          try {
            const capsuleAddress = await getTimeCapsuleAddress(wallet.publicKey, i);
            console.log(`Trying to fetch capsule at index ${i}:`, capsuleAddress.toBase58());
            
            // Check if account exists and try to fetch it
            const accountInfo = await connection.getAccountInfo(capsuleAddress);
            if (!accountInfo) {
              console.log(`Account at index ${i} doesn't exist on chain`);
              continue;
            }
            
            console.log(`Account data for index ${i}:`, accountInfo);
            console.log(`Account data length: ${accountInfo.data.length}, owner: ${accountInfo.owner.toBase58()}`);
            
            // Try to decode with our program
            try {
              const capsuleAccount = await program.account.timeCapsule.fetch(capsuleAddress);
              console.log(`Successfully decoded capsule at index ${i}:`, capsuleAccount);
              
              // Check if the owner matches
              if (capsuleAccount.owner.toString() === wallet.publicKey.toString()) {
                console.log(`Owner matches for capsule ${i}, adding to list`);
                
                // Check if we already have this capsule in our array (avoid duplicates)
                const exists = capsules.some(c => c.id === capsuleAddress.toBase58());
                
                if (!exists) {
                  capsules.push({
                    id: capsuleAddress.toBase58(),
                    message: capsuleAccount.content,
                    unlockDate: new Date(capsuleAccount.releaseTimestamp.toNumber() * 1000).toISOString(),
                    destinationChain: capsuleAccount.destinationChainId === CHAIN_IDS.sepolia ? 'sepolia' : 'arbitrum-sepolia',
                    isUnlocked: capsuleAccount.isUnlocked
                  });
                } else {
                  console.log(`Capsule at index ${i} already in list, skipping`);
                }
              } else {
                console.log(`Owner doesn't match for capsule ${i}`);
              }
            } catch (decodeErr) {
              console.log(`Failed to decode account at index ${i}:`, decodeErr.message);
              
              // Try manual decoding...
            }
          } catch (err) {
            console.log(`Error processing capsule at index ${i}:`, err.message);
          }
        }
      }
      
      console.log('Successfully fetched capsules:', capsules);
      return capsules;
    } catch (managerErr) {
      // If we can't get the manager but we already found capsules, return them
      console.warn('Error fetching manager account:', managerErr.message);
      
      if (capsules.length > 0) {
        console.log('Returning capsules found so far:', capsules);
        return capsules;
      }
      
      throw managerErr;
    }
  } catch (error) {
    console.error('Error fetching capsules:', error);
    throw error;
  }
};

export const unlockCapsule = async (wallet, capsuleId) => {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  try {
    const program = getProgram(wallet);
    const capsuleAddress = new PublicKey(capsuleId);

    console.log('Unlocking capsule address:', capsuleAddress.toBase58());

    // First fetch the capsule account to check its type
    const capsuleAccount = await program.account.timeCapsule.fetch(capsuleAddress);
    console.log('Capsule account:', capsuleAccount);

    // Check if the capsule is ready to be unlocked
    const currentTime = Math.floor(Date.now() / 1000);
    const releaseTimestamp = capsuleAccount.releaseTimestamp.toNumber();
    
    
    if (capsuleAccount.isUnlocked) {
      throw new Error('This capsule has already been unlocked.');
    }

    // Check that the wallet is the owner
    if (!capsuleAccount.owner.equals(wallet.publicKey)) {
      throw new Error('Only the capsule owner can unlock it.');
    }
    
    // Get destination chain info for logs
    let destinationChain = "unknown";
    Object.entries(CHAIN_IDS).forEach(([chain, id]) => {
      if (id === capsuleAccount.destinationChainId) {
        destinationChain = chain;
      }
    });
    
    console.log('Unlocking capsule with destination:', {
      chainId: capsuleAccount.destinationChainId,
      chainName: destinationChain,
      destinationAddress: Buffer.from(capsuleAccount.destinationAddress).toString('hex')
    });

    // Check capsule type
    const isCapsuleText = capsuleAccount.capsuleType.text !== undefined;
    const isCapsuleToken = capsuleAccount.capsuleType.token !== undefined;
    const isCapsuleNFT = capsuleAccount.capsuleType.nft !== undefined;
    
    console.log('Capsule type:', {
      isText: isCapsuleText, 
      isToken: isCapsuleToken, 
      isNFT: isCapsuleNFT
    });

    // Base accounts needed for all capsule types
    const accounts = {
      timeCapsule: capsuleAddress,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY
    };

    // Add the LayerZero endpoint
    if (LAYERZERO_ENDPOINT) {
      accounts.layerzeroEndpoint = LAYERZERO_ENDPOINT;
      console.log('LayerZero endpoint:', LAYERZERO_ENDPOINT.toBase58());
    } else {
      console.warn('LayerZero endpoint not set! Cross-chain message will not be sent.');
    }

    // Get capsule token account PDA based on the actual capsule address
    const [capsuleTokenAccount] = await PublicKey.findProgramAddress(
      [Buffer.from('token_account'), capsuleAddress.toBuffer()],
      programId
    );
    
    // Always provide capsule token account regardless of type
    accounts.capsuleTokenAccount = capsuleTokenAccount;
    console.log('Token account PDA:', capsuleTokenAccount.toBase58());
    
    // For token capsules, get destination token account, otherwise use a placeholder
    if (isCapsuleToken && capsuleAccount.tokenMint) {
      const tokenMint = capsuleAccount.tokenMint;
      // Get the owner's destination token account
      const destinationTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );
      accounts.destinationTokenAccount = destinationTokenAccount;
      accounts.tokenProgram = TOKEN_PROGRAM_ID;
      
      console.log('Token-specific accounts:', {
        tokenMint: tokenMint.toBase58(),
        destinationTokenAccount: destinationTokenAccount.toBase58()
      });
    } else {
      // For text capsules, use the wallet public key as a placeholder
      accounts.destinationTokenAccount = wallet.publicKey;
      accounts.tokenProgram = TOKEN_PROGRAM_ID;
      console.log('Using placeholder destination token account for text capsule');
    }

    console.log('Unlock accounts:', accounts);

    // Use the program.rpc method which ensures the wallet prompt appears
    console.log('Trying direct RPC call...');
    const txId = await program.methods
      .unlockCapsule()
      .accounts(accounts)
      .rpc();
    
    console.log('Unlock transaction confirmed:', txId);
    console.log(`LayerZero cross-chain message sent to ${destinationChain}. Check LayerZero Explorer: https://layerzeroscan.com/`);
    console.log(`Also check your transaction on Solana Explorer: https://explorer.solana.com/tx/${txId}?cluster=devnet`);
    
    return {
      transactionId: txId,
      capsuleId: capsuleAddress.toBase58(),
      destinationChain,
      destinationChainId: capsuleAccount.destinationChainId,
      isLayerZeroMessageSent: !!LAYERZERO_ENDPOINT
    };
  } catch (error) {
    console.error('Error unlocking capsule:', error);
    throw error;
  }
};

// Helper function to create a token time capsule
export const createTokenCapsule = async (wallet, mint, amount, unlockDate, destinationChain) => {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  try {
    // Let's do some diagnostics to find out why capsules aren't showing up
    console.log("=== TOKEN CAPSULE PDA DIAGNOSTICS ===");
    const simpleAddress = await getSimpleTimeCapsuleAddress(wallet.publicKey);
    console.log("Simple PDA address:", simpleAddress.toBase58());
    
    const program = getProgram(wallet);
    const managerAddress = await getManagerAddress();
    console.log('Manager address:', managerAddress.toBase58());

    // Check if manager exists and initialize if it doesn't
    let managerAccount;
    try {
      managerAccount = await program.account.timeCapsuleManager.fetch(managerAddress);
      console.log('Manager account exists with capsule count:', managerAccount.capsuleCount.toString());
    } catch (e) {
      console.log('Manager account not found, initializing...');
      await initializeManager(program, wallet);
      console.log('Manager initialized, waiting for confirmation...');
      
      // Wait for the account to be available
      managerAccount = await waitForAccount(program, managerAddress);
      console.log('Manager account confirmed and available');
    }

    // Get the simple PDA format address - this is what our program expects
    const capsuleAddress = simpleAddress;
    console.log('Creating token capsule at address:', capsuleAddress.toBase58());

    // Get proper chain ID and destination address
    const destinationChainId = CHAIN_IDS[destinationChain];
    if (!destinationChainId) {
      throw new Error(`Invalid destination chain: ${destinationChain}`);
    }
    console.log(`Using destination chain ID: ${destinationChainId} for ${destinationChain}`);

    const destinationContractAddress = DESTINATION_ADDRESSES[destinationChain];
    if (!destinationContractAddress) {
      throw new Error(`Destination contract address not found for ${destinationChain}`);
    }
    console.log(`Using destination contract address: ${destinationContractAddress}`);

    // Convert destination address to bytes - for LayerZero V2, this needs to be a 32-byte value
    const destinationAddress = hexToBytes(destinationContractAddress);
    console.log('Converted destination address to bytes:', Array.from(destinationAddress));

    // Get user's token account
    const mintPublicKey = new PublicKey(mint);
    const sourceTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      wallet.publicKey
    );
    console.log('Source token account:', sourceTokenAccount.toBase58());

    // First check if the account already exists
    const connection = program.provider.connection;
    const existingAccount = await connection.getAccountInfo(capsuleAddress);
    
    if (existingAccount) {
      console.log('Found existing capsule, creating a new one with index instead');
      // Get the capsule count and create a new one with an index
      const capsuleCount = managerAccount.capsuleCount.toNumber();
      const newCapsuleAddress = await getTimeCapsuleAddress(wallet.publicKey, capsuleCount);
      console.log('Creating indexed token capsule at address:', newCapsuleAddress.toBase58());
      
      // Now get the token account PDA for this new capsule address
      const [newCapsuleTokenAccount] = await PublicKey.findProgramAddress(
        [Buffer.from('token_account'), newCapsuleAddress.toBuffer()],
        programId
      );
      
      // Create token capsule with the new address
      const tx = await program.methods
        .createTokenCapsule(
          new anchor.BN(amount),
          new anchor.BN(releaseTimestamp),
          destinationChainId,
          Array.from(destinationAddress)
        )
        .accounts({
          timeCapsuleManager: managerAddress,
          timeCapsule: newCapsuleAddress,
          payer: wallet.publicKey,
          mint: mintPublicKey,
          sourceTokenAccount: sourceTokenAccount,
          capsuleTokenAccount: newCapsuleTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .transaction();
        
      // Sign and send with manual handling
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      
      // Sign the transaction
      const signedTx = await wallet.signTransaction(tx);
      
      // Send with retry
      const txId = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 5,
        preflightCommitment: 'confirmed'
      });
      
      // Wait for confirmation
      await connection.confirmTransaction({
        signature: txId,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight
      }, 'confirmed');
      
      console.log('Indexed token capsule created successfully:', txId);
      console.log('Capsule address:', newCapsuleAddress.toBase58());
      
      return {
        transactionId: txId,
        capsuleAddress: newCapsuleAddress.toBase58(),
        destinationChain,
      };
    }

    // Get the token account PDA for the capsule
    const [capsuleTokenAccount] = await PublicKey.findProgramAddress(
      [Buffer.from('token_account'), capsuleAddress.toBuffer()],
      programId
    );
    console.log('Capsule token account:', capsuleTokenAccount.toBase58());

    // Create the capsule - ensure timestamp is an integer
    const releaseTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);
    console.log('Creating token capsule with release timestamp:', releaseTimestamp);
    console.log('Creating token capsule with amount:', amount);
    
    // Try with manual transaction building which is more reliable
    const tx = await program.methods
      .createTokenCapsule(
        new anchor.BN(amount),
        new anchor.BN(releaseTimestamp),
        destinationChainId,
        Array.from(destinationAddress)
      )
      .accounts({
        timeCapsuleManager: managerAddress,
        timeCapsule: capsuleAddress,
        payer: wallet.publicKey,
        mint: mintPublicKey,
        sourceTokenAccount: sourceTokenAccount,
        capsuleTokenAccount: capsuleTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .transaction();
      
    // Sign and send with manual handling
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(tx);
    
    // Send with retry
    const txId = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      maxRetries: 5,
      preflightCommitment: 'confirmed'
    });
    
    // Wait for confirmation using a more robust method
    await connection.confirmTransaction({
      signature: txId,
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight
    }, 'confirmed');
    
    console.log('Token capsule created successfully:', txId);
    console.log('Capsule address:', capsuleAddress.toBase58());
    
    // Verify capsule was created
    try {
      const createdCapsule = await program.account.timeCapsule.fetch(capsuleAddress);
      console.log('Successfully verified token capsule creation:', createdCapsule);
    } catch (verifyError) {
      console.log('Warning: Could not verify token capsule creation:', verifyError);
    }
    
    // Show instructions for checking on Solana explorer
    console.log(`Check your transaction on Solana Explorer: https://explorer.solana.com/tx/${txId}?cluster=devnet`);
    
    return {
      transactionId: txId,
      capsuleAddress: capsuleAddress.toBase58(),
      destinationChain,
    };
  } catch (error) {
    console.error('Error creating token capsule:', error);
    throw error;
  }
}; 
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import fs from 'fs';

const PROGRAM_ID = "428gGmLitQZZHuz6SFW9TycS4b9JsULpB3yM4Wi6Jvos";

async function fetchIDL() {
  const connection = new Connection("https://api.devnet.solana.com");
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: PublicKey.default,
      signTransaction: () => Promise.reject(),
      signAllTransactions: () => Promise.reject(),
    },
    { commitment: 'confirmed' }
  );

  try {
    const idl = await Program.fetchIdl(new PublicKey(PROGRAM_ID), provider);
    if (idl) {
      fs.writeFileSync('src/utils/idl.json', JSON.stringify(idl, null, 2));
      console.log('IDL fetched and saved to idl.json');
      return idl;
    } else {
      console.error('IDL not found');
      // If we can't fetch the IDL, let's use a basic one based on your program structure
      const basicIdl = {
        version: "0.1.0",
        name: "time_capsule",
        instructions: [
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
            name: "unlockCapsule",
            accounts: [
              { name: "timeCapsule", isMut: true, isSigner: false },
              { name: "payer", isMut: true, isSigner: true },
              { name: "systemProgram", isMut: false, isSigner: false }
            ],
            args: []
          }
        ],
        accounts: [
          {
            name: "TimeCapsuleManager",
            type: {
              kind: "struct",
              fields: [
                { name: "authority", type: "publicKey" },
                { name: "capsuleCount", type: "u64" }
              ]
            }
          },
          {
            name: "TimeCapsule",
            type: {
              kind: "struct",
              fields: [
                { name: "owner", type: "publicKey" },
                { name: "releaseTimestamp", type: "i64" },
                { name: "content", type: "string" },
                { name: "isUnlocked", type: "bool" },
                { name: "destinationChainId", type: "u16" },
                { name: "destinationAddress", type: { array: ["u8", 32] } }
              ]
            }
          }
        ]
      };
      fs.writeFileSync('src/utils/idl.json', JSON.stringify(basicIdl, null, 2));
      console.log('Basic IDL created and saved to idl.json');
      return basicIdl;
    }
  } catch (error) {
    console.error('Error fetching IDL:', error);
    throw error;
  }
}

fetchIDL(); 
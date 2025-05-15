const anchor = require('@project-serum/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');

// Constants
const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'); // Replace with your actual program ID
const TIME_CAPSULE_MANAGER_SEED = 'manager';

class TimeCapsuleClient {
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
    
    // Load the IDL from the program
    try {
      this.program = new anchor.Program(IDL, PROGRAM_ID, provider);
    } catch (err) {
      console.error('Failed to load program:', err);
      throw err;
    }

    return this;
  }

  async getTimeCapsuleManagerAddress() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(TIME_CAPSULE_MANAGER_SEED)],
      this.program.programId
    )[0];
  }

  async getTimeCapsuleAddress(owner, capsuleCount) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('time_capsule'),
        owner.toBuffer(),
        new anchor.BN(capsuleCount).toArrayLike(Buffer, 'le', 8)
      ],
      this.program.programId
    )[0];
  }

  async getTokenAccountAddress(timeCapsuleAddress, mint) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('token_account'), timeCapsuleAddress.toBuffer()],
      this.program.programId
    )[0];
  }

  async initialize() {
    const managerAddress = await this.getTimeCapsuleManagerAddress();
    
    return this.program.methods
      .initialize()
      .accounts({
        timeCapsuleManager: managerAddress,
        authority: this.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  async createTextCapsule(message, releaseTimestamp, destinationChainId, destinationAddress) {
    const managerAddress = await this.getTimeCapsuleManagerAddress();
    
    // Get capsule count to derive next capsule address
    const managerAccount = await this.program.account.timeCapsuleManager.fetch(managerAddress);
    const capsuleCount = managerAccount.capsuleCount;
    
    const timeCapsuleAddress = await this.getTimeCapsuleAddress(
      this.wallet.publicKey,
      capsuleCount
    );

    return this.program.methods
      .createTextCapsule(
        message,
        new anchor.BN(releaseTimestamp),
        destinationChainId,
        destinationAddress
      )
      .accounts({
        timeCapsuleManager: managerAddress,
        timeCapsule: timeCapsuleAddress,
        payer: this.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  async createTokenCapsule(mint, amount, releaseTimestamp, destinationChainId, destinationAddress) {
    const managerAddress = await this.getTimeCapsuleManagerAddress();
    
    // Get capsule count to derive next capsule address
    const managerAccount = await this.program.account.timeCapsuleManager.fetch(managerAddress);
    const capsuleCount = managerAccount.capsuleCount;
    
    const timeCapsuleAddress = await this.getTimeCapsuleAddress(
      this.wallet.publicKey,
      capsuleCount
    );

    // Get user's token account
    const sourceTokenAccount = await getAssociatedTokenAddress(
      mint,
      this.wallet.publicKey
    );

    // Get the PDA's token account
    const capsuleTokenAccount = await this.getTokenAccountAddress(timeCapsuleAddress, mint);

    return this.program.methods
      .createTokenCapsule(
        new anchor.BN(amount),
        new anchor.BN(releaseTimestamp),
        destinationChainId,
        destinationAddress
      )
      .accounts({
        timeCapsuleManager: managerAddress,
        timeCapsule: timeCapsuleAddress,
        payer: this.wallet.publicKey,
        mint: mint,
        sourceTokenAccount: sourceTokenAccount,
        capsuleTokenAccount: capsuleTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }

  async unlockCapsule(timeCapsuleAddress, tokenMint = null) {
    const accounts = {
      timeCapsule: timeCapsuleAddress,
      payer: this.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    };

    // If this is a token capsule, add the token accounts
    if (tokenMint) {
      const capsuleTokenAccount = await this.getTokenAccountAddress(timeCapsuleAddress, tokenMint);
      const destinationTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        this.wallet.publicKey
      );
      
      accounts.capsuleTokenAccount = capsuleTokenAccount;
      accounts.destinationTokenAccount = destinationTokenAccount;
      accounts.tokenProgram = TOKEN_PROGRAM_ID;
    }

    return this.program.methods
      .unlockCapsule()
      .accounts(accounts)
      .rpc();
  }

  async getAllCapsules() {
    const ownerFilter = {
      memcmp: {
        offset: 8, // After the discriminator
        bytes: this.wallet.publicKey.toBase58(),
      }
    };

    return this.program.account.timeCapsule.all([ownerFilter]);
  }
}

// Replace this with your actual IDL
const IDL = {
  // This is a placeholder and should be replaced with the actual IDL generated from your anchor program
  version: "0.1.0",
  name: "time_capsule",
  instructions: [
    // Instructions would be defined here based on your program
  ],
  accounts: [
    // Account structs would be defined here
  ],
  // Additional IDL information
};

module.exports = { TimeCapsuleClient, PROGRAM_ID }; 
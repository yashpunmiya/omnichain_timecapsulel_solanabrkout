use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
use anchor_lang::solana_program::sysvar::rent::Rent;
use std::mem::size_of;

// Import our LayerZero module
mod layerzero;
use layerzero::{LayerZeroEndpoint, DestinationAddress, MessagePayload, send_message, LayerZeroMessageSent};

// Import LayerZero dependencies
// Note: These would come from the layerzero-v2 crate
// For now we'll define placeholders for the interfaces we need

// Token program ID constant
pub const TOKEN_PROGRAM_ID: Pubkey = anchor_lang::solana_program::pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

declare_id!("428gGmLitQZZHuz6SFW9TycS4b9JsULpB3yM4Wi6Jvos"); // Replace with your program ID

#[program]
pub mod time_capsule {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let time_capsule_manager = &mut ctx.accounts.time_capsule_manager;
        time_capsule_manager.authority = ctx.accounts.authority.key();
        time_capsule_manager.capsule_count = 0;
        Ok(())
    }

    // Create a text-based time capsule
    pub fn create_text_capsule(
        ctx: Context<CreateTextCapsule>,
        message: String,
        release_timestamp: i64,
        destination_chain_id: u16,
        destination_address: [u8; 32],
    ) -> Result<()> {
        let time_capsule_manager = &mut ctx.accounts.time_capsule_manager;
        let time_capsule = &mut ctx.accounts.time_capsule;
        let clock = Clock::get()?;
        
        // Validate release timestamp is in the future
        if release_timestamp <= clock.unix_timestamp {
            return Err(error!(ErrorCode::InvalidReleaseTime));
        }

        // Initialize the time capsule
        time_capsule.owner = ctx.accounts.payer.key();
        time_capsule.capsule_type = CapsuleType::Text;
        time_capsule.release_timestamp = release_timestamp;
        time_capsule.created_at = clock.unix_timestamp;
        time_capsule.is_unlocked = false;
        time_capsule.destination_chain_id = destination_chain_id;
        time_capsule.destination_address = destination_address;
        
        // Store the message
        time_capsule.content = message;
        
        // Increment the capsule count
        time_capsule_manager.capsule_count += 1;
        
        // Emit event
        emit!(CapsuleCreatedEvent {
            capsule_id: time_capsule.key(),
            owner: ctx.accounts.payer.key(),
            release_timestamp,
            capsule_type: CapsuleType::Text,
        });
        
        Ok(())
    }

    // Create a token-based time capsule (SPL tokens)
    pub fn create_token_capsule(
        ctx: Context<CreateTokenCapsule>,
        amount: u64,
        release_timestamp: i64,
        destination_chain_id: u16,
        destination_address: [u8; 32],
    ) -> Result<()> {
        let time_capsule_manager = &mut ctx.accounts.time_capsule_manager;
        let time_capsule = &mut ctx.accounts.time_capsule;
        let clock = Clock::get()?;
        
        // Validate release timestamp is in the future
        if release_timestamp <= clock.unix_timestamp {
            return Err(error!(ErrorCode::InvalidReleaseTime));
        }

        // Initialize the time capsule
        time_capsule.owner = ctx.accounts.payer.key();
        time_capsule.capsule_type = CapsuleType::Token;
        time_capsule.release_timestamp = release_timestamp;
        time_capsule.created_at = clock.unix_timestamp;
        time_capsule.is_unlocked = false;
        time_capsule.destination_chain_id = destination_chain_id;
        time_capsule.destination_address = destination_address;
        time_capsule.token_mint = Some(ctx.accounts.mint.key());
        time_capsule.token_amount = Some(amount);
        
        // Transfer tokens from user to PDA
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.source_token_account.to_account_info(),
                    to: ctx.accounts.capsule_token_account.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;
        
        // Increment the capsule count
        time_capsule_manager.capsule_count += 1;
        
        // Emit event
        emit!(CapsuleCreatedEvent {
            capsule_id: time_capsule.key(),
            owner: ctx.accounts.payer.key(),
            release_timestamp,
            capsule_type: CapsuleType::Token,
        });
        
        Ok(())
    }

    // Unlock a time capsule at or after the release timestamp
    pub fn unlock_capsule(ctx: Context<UnlockCapsule>) -> Result<()> {
        let clock = Clock::get()?;
        
        // Check if the capsule is already unlocked
        if ctx.accounts.time_capsule.is_unlocked {
            return Err(error!(ErrorCode::CapsuleAlreadyUnlocked));
        }
        
        // Check if it's time to unlock
        if clock.unix_timestamp < ctx.accounts.time_capsule.release_timestamp {
            return Err(error!(ErrorCode::CapsuleNotReadyForUnlock));
        }
        
        // Check that the person unlocking is the owner
        if ctx.accounts.time_capsule.owner != ctx.accounts.payer.key() {
            return Err(error!(ErrorCode::NotCapsuleOwner));
        }
        
        // Store owner and capsule type before marking as unlocked
        let owner_bytes = ctx.accounts.time_capsule.owner.to_bytes();
        let capsule_type = ctx.accounts.time_capsule.capsule_type.clone();
        let destination_chain_id = ctx.accounts.time_capsule.destination_chain_id;
        
        // Mark as unlocked
        ctx.accounts.time_capsule.is_unlocked = true;
        ctx.accounts.time_capsule.unlocked_at = Some(clock.unix_timestamp);
        
        // If it's a token capsule, return tokens to the owner
        if capsule_type == CapsuleType::Token {
            if let (Some(amount), Some(token_mint)) = (ctx.accounts.time_capsule.token_amount, ctx.accounts.time_capsule.token_mint) {
                // Check if token program is provided
                if ctx.accounts.token_program.is_none() {
                    return Err(error!(ErrorCode::MissingTokenAccounts));
                }
                
                // Validate token program key
                if ctx.accounts.token_program.as_ref().unwrap().key() != TOKEN_PROGRAM_ID {
                    return Err(error!(ErrorCode::InvalidTokenProgram));
                }
                
                // Get expected PDA for token account
                let (expected_token_account, _) = Pubkey::find_program_address(
                    &[b"token_account", ctx.accounts.time_capsule.key().as_ref()],
                    &crate::ID
                );
                
                // Check if provided token account matches expected PDA
                if ctx.accounts.capsule_token_account.key() != expected_token_account {
                    msg!("Provided token account doesn't match expected PDA");
                    return Err(error!(ErrorCode::InvalidTokenAccount));
                }
                
                msg!("Returning {} tokens to owner", amount);
                
                // Return tokens to owner using cross-program invocation
                let token_program = ctx.accounts.token_program.as_ref().unwrap();
                
                // Create transfer instruction
                let transfer_ix = anchor_lang::solana_program::instruction::Instruction {
                    program_id: TOKEN_PROGRAM_ID,
                    accounts: vec![
                        AccountMeta::new(ctx.accounts.capsule_token_account.key(), false),
                        AccountMeta::new(ctx.accounts.destination_token_account.key(), false),
                        AccountMeta::new_readonly(ctx.accounts.time_capsule.key(), true),
                    ],
                    data: anchor_lang::solana_program::instruction::Instruction::new_with_bytes(
                        TOKEN_PROGRAM_ID,
                        &[3, 0, 0, 0], // Transfer instruction = 3
                        vec![
                            AccountMeta::new(ctx.accounts.capsule_token_account.key(), false),
                            AccountMeta::new(ctx.accounts.destination_token_account.key(), false),
                            AccountMeta::new_readonly(ctx.accounts.time_capsule.key(), true),
                        ],
                    ).data.clone(),
                };
                
                // Use PDA as signer
                let seeds = &[
                    b"time_capsule".as_ref(),
                    &owner_bytes,
                    &[ctx.bumps.time_capsule],
                ];
                let signer_seeds = &[&seeds[..]];
                
                // Execute the instruction
                anchor_lang::solana_program::program::invoke_signed(
                    &transfer_ix,
                    &[
                        ctx.accounts.capsule_token_account.to_account_info(),
                        ctx.accounts.destination_token_account.to_account_info(),
                        ctx.accounts.time_capsule.to_account_info(),
                    ],
                    signer_seeds,
                )?;
            }
        } else {
            msg!("Processing text capsule, no token transfer needed");
        }
        
        // Send message via LayerZero
        // This would integrate with the LayerZero endpoint
        if ctx.accounts.layerzero_endpoint.is_some() {
            let capsule_type_code = match ctx.accounts.time_capsule.capsule_type {
                CapsuleType::Text => 0u8,
                CapsuleType::Token => 1u8,
                CapsuleType::NFT => 2u8,
            };
            
            // Create the message payload
            let payload = MessagePayload {
                owner: ctx.accounts.payer.key(),
                unlock_timestamp: clock.unix_timestamp,
                creation_timestamp: ctx.accounts.time_capsule.created_at,
                capsule_type: capsule_type_code,
                message: ctx.accounts.time_capsule.content.clone(),
            };
            
            // Create the destination address
            let destination = DestinationAddress {
                chain_id: destination_chain_id,
                address: ctx.accounts.time_capsule.destination_address,
            };
            
            msg!("Sending LayerZero message to chain {}", destination_chain_id);
            
            // Send the LayerZero message
            send_message(
                ctx.accounts.layerzero_endpoint.as_ref().unwrap(),
                destination,
                payload,
                0, // gas fee (would need to be set properly in production)
                &ctx.accounts.payer.to_account_info(),
            )?;
            
            msg!("LayerZero message sent successfully");
        } else {
            // If no LayerZero endpoint provided, just emit the event
            emit!(CapsuleUnlockedEvent {
                capsule_id: ctx.accounts.time_capsule.key(),
                owner: ctx.accounts.payer.key(),
                unlocked_at: clock.unix_timestamp,
                destination_chain_id,
            });
            
            msg!("No LayerZero endpoint provided, emitted event only");
        }
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + size_of::<TimeCapsuleManager>(),
        seeds = [b"manager"],
        bump
    )]
    pub time_capsule_manager: Account<'info, TimeCapsuleManager>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateTextCapsule<'info> {
    #[account(
        mut,
        seeds = [b"manager"],
        bump
    )]
    pub time_capsule_manager: Account<'info, TimeCapsuleManager>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + size_of::<TimeCapsule>() + 1000, // Allow space for message
        seeds = [b"time_capsule", payer.key().as_ref()],
        bump
    )]
    pub time_capsule: Account<'info, TimeCapsule>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateTokenCapsule<'info> {
    #[account(
        mut,
        seeds = [b"manager"],
        bump
    )]
    pub time_capsule_manager: Account<'info, TimeCapsuleManager>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + size_of::<TimeCapsule>() + 100, // Additional space for token info
        seeds = [b"time_capsule", payer.key().as_ref()],
        bump
    )]
    pub time_capsule: Account<'info, TimeCapsule>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = source_token_account.owner == payer.key(),
        constraint = source_token_account.mint == mint.key()
    )]
    pub source_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = payer,
        token::mint = mint,
        token::authority = time_capsule,
        seeds = [b"token_account", time_capsule.key().as_ref()],
        bump
    )]
    pub capsule_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UnlockCapsule<'info> {
    #[account(
        mut,
        seeds = [b"time_capsule", payer.key().as_ref()],
        bump,
        constraint = time_capsule.owner == payer.key()
    )]
    pub time_capsule: Account<'info, TimeCapsule>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    // These accounts are only needed for token capsules
    /// CHECK: This account is checked in the instruction handler
    #[account(mut)]
    pub capsule_token_account: AccountInfo<'info>,
    
    /// CHECK: This account is checked in the instruction handler
    #[account(mut)]
    pub destination_token_account: AccountInfo<'info>,
    
    /// CHECK: Validated in the instruction handler
    pub token_program: Option<AccountInfo<'info>>,
    
    // For LayerZero integration - make it not required for testing
    /// CHECK: This is a LayerZero endpoint that will be validated separately
    pub layerzero_endpoint: Option<AccountInfo<'info>>,
    
    pub system_program: Program<'info, System>,
    
    /// Rent sysvar is needed for token account initialization
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct TimeCapsuleManager {
    pub authority: Pubkey,
    pub capsule_count: u64,
}

#[account]
pub struct TimeCapsule {
    pub owner: Pubkey,
    pub capsule_type: CapsuleType,
    pub release_timestamp: i64,
    pub created_at: i64,
    pub is_unlocked: bool,
    pub unlocked_at: Option<i64>,
    pub content: String,  // For text capsules
    pub token_mint: Option<Pubkey>,  // For token capsules
    pub token_amount: Option<u64>,   // For token capsules
    pub destination_chain_id: u16,   // LayerZero chain ID
    pub destination_address: [u8; 32], // Destination address on target chain
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CapsuleType {
    Text,
    Token,
    NFT,
}

#[event]
pub struct CapsuleCreatedEvent {
    pub capsule_id: Pubkey,
    pub owner: Pubkey,
    pub release_timestamp: i64,
    pub capsule_type: CapsuleType,
}

#[event]
pub struct CapsuleUnlockedEvent {
    pub capsule_id: Pubkey,
    pub owner: Pubkey,
    pub unlocked_at: i64,
    pub destination_chain_id: u16,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Release timestamp must be in the future")]
    InvalidReleaseTime,
    #[msg("Capsule is already unlocked")]
    CapsuleAlreadyUnlocked,
    #[msg("Capsule is not ready to be unlocked yet")]
    CapsuleNotReadyForUnlock,
    #[msg("Only the capsule owner can unlock it")]
    NotCapsuleOwner,
    #[msg("Token accounts required for unlocking token capsule are missing")]
    MissingTokenAccounts,
    #[msg("Invalid token program")]
    InvalidTokenProgram,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
} 
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Alert,
  Snackbar
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import LockClockIcon from '@mui/icons-material/LockClock';
import SendIcon from '@mui/icons-material/Send';
import { useWallet } from '@solana/wallet-adapter-react';
import { createTimeCapsule } from '../utils/blockchain';

const SUPPORTED_CHAINS = [
  { id: 'solana', name: 'Solana', icon: '🌟' },
  { id: 'sepolia', name: 'Ethereum Sepolia', icon: '⟠' },
  { id: 'arbitrum-sepolia', name: 'Arbitrum Sepolia', icon: '⬡' }
];

const CreateCapsule = () => {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [unlockDate, setUnlockDate] = useState(null);
  const [destinationChain, setDestinationChain] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleCreate = async () => {
    if (!wallet.publicKey) {
      setNotification({
        open: true,
        message: 'Please connect your wallet first',
        severity: 'warning'
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Calculate unlock date in seconds
      if (!unlockDate) {
        throw new Error('Please select an unlock date');
      }
      
      // Call the blockchain function to create a text capsule
      await createTimeCapsule(wallet, message, unlockDate, destinationChain);
      
      setNotification({
        open: true,
        message: 'Time capsule created successfully!',
        severity: 'success'
      });
      
      // Reset form
      setMessage('');
      setUnlockDate(null);
      setDestinationChain('');
      handleClose();
    } catch (error) {
      console.error('Error creating capsule:', error);
      
      setNotification({
        open: true,
        message: `Error creating capsule: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: 'Orbitron',
            color: 'var(--text-primary)',
            fontWeight: 700,
            mb: 2
          }}
        >
          Create Time Capsule
        </Typography>
        <Typography
          sx={{
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '0 auto'
          }}
        >
          Lock your message in a secure vault and send it across chains
        </Typography>
      </Box>

      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Paper
          onClick={handleOpen}
          className="glass-card"
          sx={{
            maxWidth: '600px',
            margin: '0 auto',
            p: 6,
            cursor: 'pointer',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(45deg, var(--accent-primary), transparent)',
              opacity: 0.1
            }}
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'reverse'
            }}
          >
            <LockClockIcon sx={{ fontSize: 100, color: 'var(--accent-primary)', mb: 3 }} />
          </motion.div>
          <Typography
            variant="h4"
            sx={{
              color: 'var(--text-primary)',
              fontFamily: 'Orbitron',
              fontWeight: 600,
              mb: 2
            }}
          >
            Create New Capsule
          </Typography>
          <Typography sx={{ color: 'var(--text-secondary)' }}>
            Click to start creating your time capsule
          </Typography>
        </Paper>
      </motion.div>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          className: 'modal-content'
        }}
        BackdropProps={{
          className: 'modal-backdrop'
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Orbitron', color: 'var(--text-primary)' }}>
          Create Time Capsule
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Your Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'var(--accent-primary)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--accent-primary)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'var(--text-secondary)',
                },
              }}
            />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Unlock Date & Time"
                value={unlockDate}
                onChange={setUnlockDate}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: 'var(--accent-primary)',
                        },
                      },
                    }}
                  />
                )}
              />
            </LocalizationProvider>

            <FormControl fullWidth>
              <InputLabel sx={{ color: 'var(--text-secondary)' }}>
                Destination Chain
              </InputLabel>
              <Select
                value={destinationChain}
                onChange={(e) => setDestinationChain(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--accent-primary)',
                  },
                }}
              >
                {SUPPORTED_CHAINS.map((chain) => (
                  <MenuItem key={chain.id} value={chain.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{chain.icon}</span>
                      <span>{chain.name}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleClose}
            sx={{
              color: 'var(--text-secondary)',
              '&:hover': {
                color: 'var(--text-primary)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!message || !unlockDate || !destinationChain || isCreating}
            className={!isCreating ? 'pulse-button' : ''}
            sx={{
              background: 'var(--accent-primary)',
              '&:hover': {
                background: 'var(--accent-primary)',
                opacity: 0.9,
              },
            }}
            endIcon={<SendIcon />}
          >
            {isCreating ? 'Creating...' : 'Create Capsule'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </motion.div>
  );
};

export default CreateCapsule;

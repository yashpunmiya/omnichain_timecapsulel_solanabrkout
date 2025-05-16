import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  Button, 
  Box, 
  CircularProgress, 
  Alert, 
  Snackbar, 
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { fetchUserCapsules, unlockCapsule } from '../utils/blockchain';
import RefreshIcon from '@mui/icons-material/Refresh';
import { motion, AnimatePresence } from 'framer-motion';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { formatDistanceToNow } from 'date-fns';

// Convert to forwardRef to expose methods to parent
const ViewCapsules = forwardRef((props, ref) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [rpcError, setRpcError] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState(null);
  const [unlockingCapsule, setUnlockingCapsule] = useState(false);

  const loadCapsules = async () => {
    if (!wallet.publicKey) {
      setCapsules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setRpcError(false);
    try {
      console.log('Loading capsules with wallet:', wallet.publicKey.toString());
      const userCapsules = await fetchUserCapsules(wallet);
      console.log('Loaded capsules:', userCapsules);
      
      // Map the capsules and set the status property based on isUnlocked
      const mappedCapsules = userCapsules.map(capsule => ({
        ...capsule,
        status: capsule.isUnlocked ? 'unlocked' : 'locked'
      }));
      
      setCapsules(mappedCapsules);
    } catch (error) {
      console.error('Error loading capsules:', error);
      
      // Check for RPC-specific errors
      if (error.message && (
          error.message.includes('403') || 
          error.message.includes('429') || 
          error.message.includes('Access forbidden') ||
          error.message.includes('RPC access error'))) {
        setRpcError(true);
        setNotification({
          open: true,
          message: 'RPC access error: Server rate limit exceeded. Please try again later.',
          severity: 'warning'
        });
      } else {
        setNotification({
          open: true,
          message: `Error loading capsules: ${error.message}`,
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    loadCapsules
  }));

  useEffect(() => {
    if (wallet.publicKey) {
      loadCapsules();
    } else {
      setCapsules([]);
      setLoading(false);
    }
  }, [wallet.publicKey]);

  const handleUnlock = async (capsule) => {
    if (!wallet.publicKey) return;

    setUnlockingCapsule(true);
    try {
      // Call the unlock function
      const result = await unlockCapsule(wallet, capsule.id);
      console.log('Unlock result:', result);
      
      setNotification({
        open: true,
        message: 'Time capsule unlocked successfully!',
        severity: 'success'
      });
      
      // Reload capsules after unlock
      await loadCapsules();
    } catch (error) {
      console.error('Error unlocking capsule:', error);
      
      // Handle specific error cases
      let errorMessage = "Unknown error occurred";
      
      // Safely check error messages
      if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
          
          if (error.message.includes('AccountOwnedByWrongProgram')) {
            errorMessage = 'Unable to unlock: This capsule needs to be recreated due to a token account issue.';
          } else if (error.message.includes('CapsuleNotReadyForUnlock')) {
            errorMessage = 'This capsule is not ready to be unlocked yet.';
          } else if (error.message.includes('CapsuleAlreadyUnlocked')) {
            errorMessage = 'This capsule has already been unlocked.';
          } else if (error.message.includes('User rejected')) {
            errorMessage = 'Transaction was cancelled by the user.';
          }
        } else if (error.InstructionError) {
          errorMessage = 'Program execution error: ' + JSON.stringify(error.InstructionError);
        } else {
          errorMessage = JSON.stringify(error);
        }
      }
      
      setNotification({
        open: true,
        message: `Error unlocking capsule: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setUnlockingCapsule(false);
      setSelectedCapsule(null); // Close the modal after unlock attempt
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const getChainIcon = (chain) => {
    const icons = {
      solana: '🌟',
      ethereum: '⟠',
      polygon: '⬡',
      avalanche: '🔺',
      sepolia: '⟠',
      'arbitrum-sepolia': '⬡'
    };
    
    // Safely handle null/undefined/non-string values
    if (!chain) return '🔗';
    
    // Convert to lowercase for case-insensitive matching
    const lowerChain = typeof chain === 'string' ? chain.toLowerCase() : String(chain).toLowerCase();
    return icons[lowerChain] || '🔗';
  };

  if (!wallet.publicKey) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6">Please connect your wallet to view your capsules</Typography>
      </Paper>
    );
  }

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
          Your Time Capsules
        </Typography>
        <Typography
          sx={{
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '0 auto'
          }}
        >
          Monitor and unlock your time capsules when they're ready
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : capsules.length === 0 ? (
        <Paper className="glass-card" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: 'var(--text-secondary)' }}>
            No time capsules found
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          <AnimatePresence>
            {capsules.map((capsule) => (
              <Grid item xs={12} md={6} lg={4} key={capsule.id}>
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Paper
                    className="capsule-card"
                    onClick={() => setSelectedCapsule(capsule)}
                    sx={{
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2
                      }}
                    >
                      <Chip
                        icon={capsule.status === 'locked' ? <LockIcon /> : <LockOpenIcon />}
                        label={capsule.status ? capsule.status.toUpperCase() : 'LOCKED'}
                        sx={{
                          background: capsule.status === 'locked' ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      {capsule.destinationChain && (
                        <Chip
                          icon={<span>{getChainIcon(capsule.destinationChain.toLowerCase())}</span>}
                          label={capsule.destinationChain.toUpperCase()}
                          className="chain-badge"
                        />
                      )}
                    </Box>

                    <Typography
                      sx={{
                        color: 'var(--text-primary)',
                        mb: 2,
                        fontFamily: 'Orbitron'
                      }}
                      className={capsule.status === 'locked' ? 'blur-content' : ''}
                    >
                      {capsule.message || "No message available"}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTimeIcon sx={{ color: 'var(--text-secondary)' }} />
                      <Typography
                        variant="body2"
                        className="countdown-timer"
                      >
                        {capsule.unlockDate ? (
                          capsule.status === 'locked' 
                            ? `Unlocks ${formatDistanceToNow(new Date(capsule.unlockDate), { addSuffix: true })}`
                            : 'Ready to unlock'
                        ) : 'Unknown unlock time'}
                      </Typography>
                    </Box>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      )}

      <Dialog
        open={!!selectedCapsule}
        onClose={() => setSelectedCapsule(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          className: 'modal-content'
        }}
        BackdropProps={{
          className: 'modal-backdrop'
        }}
      >
        {selectedCapsule && (
          <>
            <DialogTitle sx={{ fontFamily: 'Orbitron', color: 'var(--text-primary)' }}>
              Time Capsule Details
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ color: 'var(--text-secondary)', mb: 1 }}>
                  Status
                </Typography>
                <Chip
                  icon={selectedCapsule.status === 'locked' ? <LockIcon /> : <LockOpenIcon />}
                  label={(selectedCapsule.status || 'locked').toUpperCase()}
                  sx={{
                    background: selectedCapsule.status === 'locked' || !selectedCapsule.status ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                    color: 'var(--text-primary)',
                    mb: 3
                  }}
                />

                <Typography sx={{ color: 'var(--text-secondary)', mb: 1 }}>
                  Message
                </Typography>
                <Typography
                  sx={{
                    color: 'var(--text-primary)',
                    mb: 3,
                    p: 2,
                    background: 'var(--glass-background)',
                    borderRadius: 1,
                    fontFamily: 'monospace'
                  }}
                  className={selectedCapsule.status === 'locked' ? 'blur-content' : ''}
                >
                  {selectedCapsule.message || 'No message available'}
                </Typography>

                <Typography sx={{ color: 'var(--text-secondary)', mb: 1 }}>
                  Unlock Time
                </Typography>
                <Typography
                  sx={{
                    color: 'var(--accent-secondary)',
                    mb: 3,
                    fontFamily: 'Orbitron'
                  }}
                >
                  {selectedCapsule.unlockDate 
                    ? formatDistanceToNow(new Date(selectedCapsule.unlockDate), { addSuffix: true }) 
                    : 'Unknown unlock time'}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button
                onClick={() => setSelectedCapsule(null)}
                sx={{
                  color: 'var(--text-secondary)',
                  '&:hover': {
                    color: 'var(--text-primary)',
                  },
                }}
              >
                Close
              </Button>
              {selectedCapsule.status === 'locked' && new Date() >= selectedCapsule.unlockDate && (
                <Button
                  variant="contained"
                  onClick={() => handleUnlock(selectedCapsule)}
                  disabled={unlockingCapsule}
                  className={!unlockingCapsule ? 'pulse-button' : ''}
                  sx={{
                    background: 'var(--accent-secondary)',
                    '&:hover': {
                      background: 'var(--accent-secondary)',
                      opacity: 0.9,
                    },
                  }}
                  endIcon={<LockOpenIcon />}
                >
                  {unlockingCapsule ? 'Unlocking...' : 'Unlock Capsule'}
                </Button>
              )}
            </DialogActions>
          </>
        )}
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
});

export default ViewCapsules;

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Paper, Typography, List, ListItem, Button, Box, CircularProgress, Alert, Snackbar, Chip } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { fetchUserCapsules, unlockCapsule } from '../utils/blockchain';
import RefreshIcon from '@mui/icons-material/Refresh';

// Convert to forwardRef to expose methods to parent
const ViewCapsules = forwardRef((props, ref) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [rpcError, setRpcError] = useState(false);

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
      setCapsules(userCapsules);
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

  const handleUnlock = async (capsuleId) => {
    if (!wallet.publicKey) return;

    setUnlocking(capsuleId);
    try {
      await unlockCapsule(wallet, capsuleId);
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
      setUnlocking(null);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  if (!wallet.publicKey) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6">Please connect your wallet to view your capsules</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" gutterBottom>Your Time Capsules</Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={loadCapsules} 
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      {rpcError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          RPC server rate limit exceeded. Some capsules may not be displayed. 
          Please try again later or try with a different RPC endpoint.
        </Alert>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : capsules.length === 0 ? (
        <Typography>No time capsules found</Typography>
      ) : (
        <List>
          {capsules.map((capsule) => (
            <ListItem 
              key={capsule.id} 
              divider
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: 2
              }}
            >
              {/* Message and error chip */}
              <Box display="flex" alignItems="center" gap={1} width="100%" mb={1}>
                <Typography variant="body1" fontWeight="medium">
                  {capsule.message.startsWith("Message") ? 
                    capsule.message : 
                    capsule.message}
                </Typography>
                {capsule.isErrorState && (
                  <Chip 
                    size="small" 
                    color={capsule.isRpcError ? "warning" : "error"}
                    label={capsule.isRpcError ? "RPC Limit Error" : "Error loading details"} 
                  />
                )}
              </Box>
              
              {/* Capsule details */}
              <Box sx={{ width: '100%', mb: 2 }}>
                <Typography variant="body2" component="div">
                  Unlocks at: {
                    // Check if the date is valid and display a friendly message if not
                    (() => {
                      try {
                        const date = new Date(capsule.unlockDate);
                        // Check if date is valid and in a reasonable range
                        if (isNaN(date)) {
                          return "Unknown (data error)";
                        }
                        if (date.getFullYear() > 2100) {
                          return "Far future (after year 2100)";
                        }
                        if (date.getFullYear() < 2000) {
                          return "Invalid date";
                        }
                        // Format the date nicely
                        return new Intl.DateTimeFormat('default', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZoneName: 'short'
                        }).format(date);
                      } catch (e) {
                        console.error('Error formatting date:', e);
                        return "Unknown date";
                      }
                    })()
                  }
                </Typography>
                <Typography variant="body2" component="div">
                  Destination: {capsule.destinationChain}
                </Typography>
                <Typography variant="body2" component="div">
                  Status: {
                    capsule.isErrorState ? 'Error' :
                    capsule.isUnlocked ? 'Unlocked' : 'Locked'
                  }
                </Typography>
                <Typography variant="caption" component="div" sx={{ 
                  wordBreak: 'break-all',
                  opacity: 0.7
                }}>
                  ID: {capsule.id}
                </Typography>
              </Box>
              
              {/* Action button */}
              <Button
                variant="contained"
                color="primary"
                disabled={
                  (() => {
                    try {
                      const unlockDate = new Date(capsule.unlockDate);
                      return new Date() < unlockDate || 
                             unlocking === capsule.id || 
                             capsule.isUnlocked ||
                             capsule.isErrorState ||
                             isNaN(unlockDate);
                    } catch (e) {
                      return true; // Disable button if date is invalid
                    }
                  })()
                }
                onClick={() => handleUnlock(capsule.id)}
              >
                {unlocking === capsule.id ? 'Unlocking...' : 'Unlock'}
              </Button>
            </ListItem>
          ))}
        </List>
      )}
      
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
    </Paper>
  );
});

export default ViewCapsules;

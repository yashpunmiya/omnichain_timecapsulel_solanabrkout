import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import LockClockIcon from '@mui/icons-material/LockClock';
import VisibilityIcon from '@mui/icons-material/Visibility';

const Dashboard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Typography
            variant="h2"
            sx={{
              fontFamily: 'Orbitron',
              color: 'var(--text-primary)',
              fontWeight: 700,
              mb: 2
            }}
          >
            Omnichain Time Capsule
          </Typography>
        </motion.div>
        <Typography
          variant="h6"
          sx={{
            color: 'var(--text-secondary)',
            maxWidth: '800px',
            margin: '0 auto'
          }}
        >
          Lock your digital assets and messages across chains, secured by LayerZero V2
        </Typography>
      </Box>

      <Grid container spacing={4} sx={{ mt: 4 }}>
        <Grid item xs={12} md={6}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/create" style={{ textDecoration: 'none' }}>
              <Paper
                className="glass-card"
                sx={{
                  p: 4,
                  height: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
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
                <LockClockIcon sx={{ fontSize: 60, color: 'var(--accent-primary)', mb: 2 }} />
                <Typography
                  variant="h4"
                  sx={{
                    color: 'var(--text-primary)',
                    fontFamily: 'Orbitron',
                    fontWeight: 600,
                    mb: 2
                  }}
                >
                  Create Capsule
                </Typography>
                <Typography
                  sx={{
                    color: 'var(--text-secondary)',
                    textAlign: 'center'
                  }}
                >
                  Lock your assets and messages in a secure time capsule
                </Typography>
              </Paper>
            </Link>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={6}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/view" style={{ textDecoration: 'none' }}>
              <Paper
                className="glass-card"
                sx={{
                  p: 4,
                  height: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
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
                    background: 'linear-gradient(45deg, var(--accent-secondary), transparent)',
                    opacity: 0.1
                  }}
                />
                <VisibilityIcon sx={{ fontSize: 60, color: 'var(--accent-secondary)', mb: 2 }} />
                <Typography
                  variant="h4"
                  sx={{
                    color: 'var(--text-primary)',
                    fontFamily: 'Orbitron',
                    fontWeight: 600,
                    mb: 2
                  }}
                >
                  View Capsules
                </Typography>
                <Typography
                  sx={{
                    color: 'var(--text-secondary)',
                    textAlign: 'center'
                  }}
                >
                  Monitor and unlock your time capsules
                </Typography>
              </Paper>
            </Link>
          </motion.div>
        </Grid>
      </Grid>

      <Box
        sx={{
          mt: 6,
          p: 3,
          borderRadius: 2,
          background: 'var(--glass-background)',
          border: '1px solid rgba(124, 58, 237, 0.2)'
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'var(--text-primary)',
            fontFamily: 'Orbitron',
            mb: 2
          }}
        >
          Powered by LayerZero V2
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)' }}>
          Secure cross-chain messaging protocol enabling seamless omnichain functionality
        </Typography>
      </Box>
    </motion.div>
  );
};

export default Dashboard; 
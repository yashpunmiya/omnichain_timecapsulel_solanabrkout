import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppBar, Toolbar, Typography, Box, Container } from '@mui/material';
import LockClockIcon from '@mui/icons-material/LockClock';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Dashboard from './components/Dashboard';
import CreateCapsule from './components/CreateCapsule';
import ViewCapsules from './components/ViewCapsules';

function App() {
  const [activeChain, setActiveChain] = useState('solana');

  return (
    <Router>
      <Box sx={{ flexGrow: 1, minHeight: '100vh', background: 'var(--background-primary)' }}>
        <AppBar position="static" sx={{ 
          background: 'var(--glass-background)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(124, 58, 237, 0.2)'
        }}>
          <Toolbar>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Typography variant="h6" component={Link} to="/" sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'var(--accent-primary)',
                textDecoration: 'none',
                fontFamily: 'Orbitron'
              }}>
                <LockClockIcon />
                Time Capsule
              </Typography>
            </motion.div>

            <Box sx={{ flexGrow: 1 }} />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Typography
                  component={Link}
                  to="/create"
                  sx={{
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    '&:hover': { color: 'var(--accent-secondary)' }
                  }}
                >
                  Create Capsule
                </Typography>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Typography
                  component={Link}
                  to="/view"
                  sx={{
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    '&:hover': { color: 'var(--accent-secondary)' }
                  }}
                >
                  View Capsules
                </Typography>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <WalletMultiButton 
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--accent-primary)',
                    color: 'var(--text-primary)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontFamily: 'Orbitron',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                  }}
                />
              </motion.div>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'var(--glass-background)',
                  border: '1px solid var(--accent-secondary)'
                }}
              >
                <Typography sx={{ color: 'var(--accent-secondary)' }}>
                  {activeChain.toUpperCase()}
                </Typography>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/create" element={<CreateCapsule />} />
              <Route path="/view" element={<ViewCapsules />} />
            </Routes>
          </AnimatePresence>
        </Container>
      </Box>
    </Router>
  );
}

export default App;
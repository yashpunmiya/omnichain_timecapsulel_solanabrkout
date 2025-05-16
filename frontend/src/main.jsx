import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'
import './index.css'
import { WalletContextProvider } from './config/wallet'

// Add necessary polyfills for Solana
import { Buffer } from 'buffer';
window.Buffer = Buffer;

// Create a dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7C3AED',
    },
    secondary: {
      main: '#14F195',
    },
    background: {
      default: '#0F0F0F',
      paper: 'rgba(26, 26, 26, 0.8)',
    },
  },
  typography: {
    fontFamily: 'Orbitron, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

console.log("Starting Vite application...");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WalletContextProvider>
        <App />
      </WalletContextProvider>
    </ThemeProvider>
  </React.StrictMode>,
) 
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Add necessary polyfills for Solana
import { Buffer } from 'buffer';
window.Buffer = Buffer;

console.log("Starting Vite application...");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 
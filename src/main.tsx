import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains'; // Reverted to only Base Sepolia
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterFrame as miniAppConnector } from '@farcaster/frame-wagmi-connector';
import { injected } from '@wagmi/connectors'; // Import injected connector

// Configure Wagmi
const config = createConfig({
  chains: [baseSepolia], // Reverted to only Base Sepolia
  transports: {
    [baseSepolia.id]: http(), // Base Sepolia RPC
  },
  connectors: [
    miniAppConnector(),
    injected(), // Add injected connector for MetaMask etc.
  ]
});

// Create a react-query client
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Temporarily bypass type error with 'as any' */}
    <WagmiProvider config={config as any}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

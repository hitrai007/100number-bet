# Product Requirements Document: 100 Number Bet Mini App (v0.1)

## 1. Overview

This document outlines the features and specifications for v0.1 of the 100 Number Bet game, designed as a Farcaster Mini App. The goal is to allow users to place bets on numbers from 1 to 100 using mock USDT on the Base Sepolia test network.

## 2. Goals

*   Create a functional betting game within the Farcaster Mini App ecosystem.
*   Allow users to select multiple numbers to bet on.
*   Integrate with user wallets (Farcaster default and browser-based like MetaMask) for placing bets.
*   Utilize a smart contract on Base Sepolia to manage bets and the prize pool.
*   Provide basic visual feedback for game state (selected numbers, taken numbers, total pool).
*   Implement an admin function for the contract owner to dissolve the game.

## 3. Functional Requirements (v0.1)

### 3.1. Core Gameplay

*   **Number Grid:** Display a 10x10 grid representing numbers 1 through 100.
*   **Number Selection:** Users can click on numbers in the grid to select them for betting. Clicking a selected number deselects it. Multiple numbers can be selected simultaneously.
*   **Bet Placement:**
    *   A "Place Bet" button dynamically shows the total cost and number of selections (e.g., "Place Bet: $0.50 for 5 numbers").
    *   Each selected number costs $0.10 mock USDT to bet on.
    *   Clicking the "Place Bet" button initiates a two-step transaction process:
        1.  **USDT Approval:** Prompts the user's connected wallet to approve the `NumberBet` smart contract to spend the required amount of mock USDT.
        2.  **Bet Transaction:** Prompts the user's wallet to execute the `placeBet` function on the `NumberBet` contract, transferring the approved USDT and recording the bets.
    *   The button displays loading/confirmation states during the transaction process.
*   **Taken Numbers:** Numbers already successfully bet on by any user are visually marked as "taken" (e.g., greyed out) and cannot be selected or bet on again.
*   **Selected Numbers Display:** A text area below the grid shows the currently selected numbers or "None".

### 3.2. Pool Display

*   A prominent display area shows the current total amount of mock USDT held in the `NumberBet` smart contract's prize pool (e.g., "Total Bet Pool: $X.XX USDT").
*   This value updates automatically after successful bets or game dissolution.

### 3.3. Wallet Integration

*   **Connection:** A "Connect Wallet" button allows users to connect.
    *   Inside Farcaster clients (e.g., Warpcast), it attempts to use the integrated Farcaster Frame wallet.
    *   When opened in a standard browser, it attempts to connect using injected providers like MetaMask.
*   **Display:** Shows the connected wallet address (truncated) when connected.
*   **Disconnection:** A "Disconnect" button allows users to disconnect their wallet.

### 3.4. Admin Functionality

*   **Dissolve Game:** A "Dissolve Game (Owner)" button is visible *only* to the wallet address that deployed the `NumberBet` contract.
    *   Clicking this button prompts the owner's wallet to execute the `dissolveGame` function on the contract.
    *   This function transfers the entire `totalPool` balance to the owner's address, resets the pool value to zero, and clears all recorded bets (`betsPlaced` and `userBets` mappings), making all numbers available again.

### 3.5. User Interface & Styling

*   The application utilizes the `98.css` library for a retro Windows 95 aesthetic.
*   Custom CSS is used for the grid layout, button sizing, spacing, and state indication (selected, taken).

## 4. Technical Specifications (v0.1)

*   **Framework:** React (Vite) with TypeScript
*   **Styling:** `98.css`, Custom CSS (`src/index.css`)
*   **Blockchain Network:** Base Sepolia (Testnet)
*   **Smart Contract:** `NumberBet.sol` (Solidity ^0.8.20)
    *   **Deployed Address (Base Sepolia):** `0x321D678A7786CDAB5749dA6a385110bA0E214516`
    *   **Features:** `placeBet`, `dissolveGame`, `totalPool`, `betsPlaced`, `userBets`, `Ownable`, `ReentrancyGuard`.
*   **Mock Token:** Mock USDT ERC20
    *   **Address (Base Sepolia):** `0xEF37f57D8a64Fd6EdF2184Ad4b2c4Cd718ec4538`
    *   **Decimals:** 6 (Assumed in frontend calculations and contract constants)
*   **Frontend Web3 Libraries:**
    *   `wagmi`
    *   `viem`
    *   `@tanstack/react-query`
    *   `@farcaster/frame-sdk`
    *   `@farcaster/frame-wagmi-connector`
    *   `@wagmi/connectors` (for injected provider)
*   **Build Tool:** Vite
*   **Contract Development:** Hardhat
*   **Deployment:** Vercel

## 5. Known Issues / Limitations (v0.1)

*   Wallet connection logic prioritizes Farcaster Frame connector; when run inside Warpcast, it may still trigger MetaMask if installed due to current connector handling. Requires further refinement for seamless in-frame wallet usage.
*   Error handling for transactions (approval, bet placement, dissolve) is basic (console logs). User-facing error messages are needed.
*   Transaction confirmation handling is optimistic (triggers next step on send, not confirmation). A more robust implementation should wait for `useWaitForTransactionReceipt`.
*   Refetching of contract data (pool, taken bets) relies on basic timeouts or manual triggers; could be improved with event listening or more robust refetching strategies.
*   No explicit winner selection logic implemented yet.
*   ARIA linting error for `aria-pressed` persists despite valid values being used. 
# Changelog

## [0.1.0] - YYYY-MM-DD

### Added

*   **Core Game Logic:**
    *   Implemented 1-100 number grid display using React.
    *   Enabled multi-select functionality for number buttons.
    *   Added dynamic "Place Bet" button showing cost based on selection (0.1 mock USDT per number).
    *   Integrated wallet connection using Wagmi, `@farcaster/frame-sdk`, `@farcaster/frame-wagmi-connector`, and `@wagmi/connectors`.
    *   Implemented connect/disconnect wallet flow.
    *   Added support for both Farcaster Frame wallet (intended primary) and injected browser wallets (e.g., MetaMask for testing/admin).
*   **Smart Contract (`NumberBet.sol`):**
    *   Created contract using Solidity ^0.8.20.
    *   Deployed to Base Sepolia testnet (`0x321D678A7786CDAB5749dA6a385110bA0E214516`).
    *   Implemented `placeBet` function requiring mock USDT (`0xEF37f57D8a64Fd6EdF2184Ad4b2c4Cd718ec4538`) transfer.
    *   Implemented bet tracking (`betsPlaced`, `userBets`).
    *   Implemented `totalPool` tracking.
    *   Included `Ownable` for admin control and `ReentrancyGuard` for security.
    *   Implemented `dissolveGame` function for owner to withdraw pool and reset bets.
    *   Added view functions (`getAllBetNumbers`, `getBetStatus`, `owner`, etc.).
*   **Frontend-Contract Integration:**
    *   Configured Wagmi/Viem for Base Sepolia.
    *   Added contract ABI and address to frontend.
    *   Implemented reading and displaying `totalPool`.
    *   Implemented reading and displaying already taken bet numbers (`getAllBetNumbers`).
    *   Implemented `placeBet` flow: prompts for USDT `approve` then calls contract `placeBet`.
    *   Implemented `dissolveGame` flow for contract owner.
    *   Added basic loading/confirming states for transaction buttons.
*   **Styling & UI:**
    *   Integrated `98.css` for base retro styling.
    *   Applied custom CSS for grid layout, button sizing, spacing.
    *   Added visual states for selected and taken grid buttons.
    *   Added display for selected numbers list.
*   **Development Environment:**
    *   Set up project using Vite + React + TypeScript.
    *   Configured Hardhat for contract compilation and deployment.
    *   Configured Vercel for deployment.
    *   Added `.env` handling for private keys.

### Fixed

*   Resolved numerous Hardhat compilation errors related to dependencies (`@openzeppelin/contracts` import path issues, missing Ignition dependencies, compiler version mismatches).
*   Addressed Vercel build errors caused by unused TypeScript variables.
*   Iteratively fixed grid layout issues (square cells, text alignment, spacing) caused by CSS conflicts, particularly with `98.css`.
*   Improved wallet connector selection logic to better handle browser vs. Farcaster Frame environments.

### Known Issues

*   See PRD v0.1 Section 5.

---

## [Unreleased]

### Added
- Initialized project using `create-mini-app`.
- Set up Git repository.
- Installed dependencies.
- Added basic app structure with label and number input.
- Added `98.css` for Windows 98 styling.
- Applied basic Win98 body styles (background, font).
- Created this CHANGELOG.md file. 
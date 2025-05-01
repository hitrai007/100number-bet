import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { parseUnits, formatUnits } from 'viem'; // For handling decimals

// --- Contract Config ---
const numberBetContractAddress = "0x321D678A7786CDAB5749dA6a385110bA0E214516";
const mockUsdtContractAddress = "0xEF37f57D8a64Fd6EdF2184Ad4b2c4Cd718ec4538"; // Mock USDT on Base Sepolia

const numberBetContractAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_usdtTokenAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "number",
        "type": "uint8"
      }
    ],
    "name": "AlreadyBetOnNumber",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientAllowance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "number",
        "type": "uint8"
      }
    ],
    "name": "InvalidNumber",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoNumbersToBet",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "number",
        "type": "uint8"
      }
    ],
    "name": "NumberAlreadyBet",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8[]",
        "name": "numbers",
        "type": "uint8[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalAmount",
        "type": "uint256"
      }
    ],
    "name": "BetPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalAmount",
        "type": "uint256"
      }
    ],
    "name": "GameDissolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BET_AMOUNT_PER_NUMBER",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_NUMBER",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "name": "betsPlaced",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dissolveGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllBetNumbers",
    "outputs": [
      {
        "internalType": "uint8[]",
        "name": "",
        "type": "uint8[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "_number",
        "type": "uint8"
      }
    ],
    "name": "getBetStatus",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      }
    ],
    "name": "getUserBetNumbers",
    "outputs": [
      {
        "internalType": "uint8[]",
        "name": "",
        "type": "uint8[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8[]",
        "name": "_numbers",
        "type": "uint8[]"
      }
    ],
    "name": "placeBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalPool",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "name": "userBets",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdtToken",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const; // Use 'as const' for better type inference with Wagmi

// ABI for ERC20 approve function (simplified)
const erc20Abi = [
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
   {
    "constant": true,
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;

function App() {
  // --- Wagmi Hooks ---
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { data: writeContractHash, writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmationError } = useWaitForTransactionReceipt({ hash: writeContractHash });

  // --- Component State ---
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  // Add state for loading indicators and errors if needed later

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  // --- Wagmi Read Hooks (Contract Data) ---
  const { data: totalPoolData, refetch: refetchTotalPool } = useReadContract({
    address: numberBetContractAddress,
    abi: numberBetContractAbi,
    functionName: 'totalPool',
    // chainId: baseSepolia.id, // Removed: Let Wagmi infer from connector
  });
  // Use formatUnits for correct decimal conversion (assuming 6 decimals for mock USDT)
  const totalPoolFormatted = totalPoolData ? formatUnits(totalPoolData as bigint, 6) : '0.00';

  // Read Contract Owner
  const { data: contractOwner } = useReadContract({
    address: numberBetContractAddress,
    abi: numberBetContractAbi,
    functionName: 'owner',
    // chainId: baseSepolia.id, // Removed
  });

  // Check if the connected user is the owner
  const isOwner = isConnected && address && contractOwner && address === contractOwner;

  // Read All Currently Bet Numbers
  const { data: allBetNumbersData, refetch: refetchAllBets } = useReadContract({
    address: numberBetContractAddress,
    abi: numberBetContractAbi,
    functionName: 'getAllBetNumbers',
    // chainId: baseSepolia.id, // Removed
    // Refetch is handled manually after actions for now
    // refetchInterval: 15000, // Removed: Not a direct option here
  });
  // Type should be correctly inferred as readonly number[] | undefined from ABI
  const allBetNumbers: readonly number[] = allBetNumbersData ?? [];

  // --- Event Handlers ---
  const handleNumberClick = (number: number) => {
    setSelectedNumbers(prevSelectedNumbers => {
      if (prevSelectedNumbers.includes(number)) {
        return prevSelectedNumbers.filter(n => n !== number);
      } else {
        return [...prevSelectedNumbers, number];
      }
    });
  };

  const numberOfBets = selectedNumbers.length;
  // Calculate total amount in USDT's smallest unit (assuming 6 decimals)
  const totalBetAmountWei = parseUnits((numberOfBets * 0.1).toString(), 6);
  const displayBetAmount = (numberOfBets * 0.1).toFixed(2);
  const buttonText = `Place Bet: $${displayBetAmount} for ${numberOfBets} ${numberOfBets === 1 ? 'number' : 'numbers'}`;

  const handlePlaceBet = async () => {
    if (!isConnected || !address) {
      console.error("Wallet not connected");
      // Optionally prompt connection here
      handleConnectWallet();
      return;
    }
    if (numberOfBets === 0) {
      console.error("No numbers selected");
      return;
    }

    console.log(`Attempting to approve ${displayBetAmount} USDT...`);
    try {
      // 1. Approve USDT spend
      writeContract({
          address: mockUsdtContractAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [numberBetContractAddress, totalBetAmountWei],
      }, {
        onSuccess: async (approveHash) => {
            console.log("Approval transaction sent:", approveHash);
            // TODO: Add better UI feedback (e.g., loading spinner)
            // Wait for approval confirmation? Or proceed optimistically?
            // For simplicity now, let's try placing the bet immediately after sending approval.
            // A robust implementation would wait for confirmation.

            console.log("Approval sent, attempting to place bet...");
            try {
              // 2. Place the bet
               writeContract({
                   address: numberBetContractAddress,
                   abi: numberBetContractAbi,
                   functionName: 'placeBet',
                   args: [selectedNumbers],
               }, {
                 onSuccess: (betHash) => {
                   console.log("Place bet transaction sent:", betHash);
                   // TODO: Add UI feedback (e.g., "Bet placing...")
                   // Refetch pool total & bets after potential success
                   // Consider waiting for confirmation before refetching
                   setSelectedNumbers([]); // Clear selection optimistically
                   setTimeout(() => { // Delay refetch slightly
                       refetchTotalPool();
                       refetchAllBets();
                   }, 2000); // 2 sec delay
                 },
                 onError: (betError) => {
                   console.error("Error sending place bet transaction:", betError);
                   // TODO: Show user-friendly error message
                 }
               });
            } catch (betError) {
                 console.error("Error initiating placeBet call:", betError);
            }
        },
        onError: (approveError) => {
          console.error("Error sending approval transaction:", approveError);
          // TODO: Show user-friendly error message
        }
      });

      // Add refetch after successful dissolve
      // Consider waiting for confirmation
       setTimeout(() => { // Delay refetch slightly
           refetchTotalPool();
           refetchAllBets();
       }, 2000);

    } catch (error) {
        console.error("Error initiating approval call:", error);
    }

  };

  const handleConnectWallet = () => {
    if (connectors.length > 0) {
       connect({ connector: connectors[0] });
    }
  };

  const handleDissolveGame = () => {
    if (!isOwner) {
      console.error("Only the owner can dissolve the game.");
      return;
    }
    console.log("Attempting to dissolve game...");
    writeContract({
        address: numberBetContractAddress,
        abi: numberBetContractAbi,
        functionName: 'dissolveGame',
        args: [], // No arguments needed
    }, {
        onSuccess: (dissolveHash) => {
          console.log("Dissolve game transaction sent:", dissolveHash);
          // TODO: UI Feedback, refetch pool total
          // refetchTotalPool();
        },
        onError: (dissolveError) => {
          console.error("Error sending dissolve game transaction:", dissolveError);
          // TODO: Show user-friendly error message
        }
      });
  };

  // --- Render Logic ---
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  return (
    <div className="app-container window">
      {/* Display Total Pool */}
      <div className="title-bar">
        <div className="title-bar-text">100 Number Bet Game</div>
      </div>
      <div className="window-body">
        <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' }}>
          Total Bet Pool: ${totalPoolFormatted} USDT
        </p>

         {/* Wallet Connection Status/Button */}
        <div style={{ marginBottom: '15px', textAlign: 'center' }}>
          {isConnected ? (
            <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
          ) : (
            <button onClick={handleConnectWallet}>Connect Wallet</button>
          )}
        </div>

        <div className="grid-container">
          {numbers.map((number) => {
            const isSelected = selectedNumbers.includes(number);
            const isAlreadyBet = allBetNumbers.includes(number);
            const isDisabled = isAlreadyBet;
            const ariaPressedValue = isSelected ? "true" : "false";

            return (
              <button
                key={number}
                className={`grid-button ${isSelected ? "selected" : ""} ${isAlreadyBet ? "taken" : ""}`}
                onClick={() => !isDisabled && handleNumberClick(number)}
                disabled={isDisabled}
                aria-pressed={ariaPressedValue}
                aria-label={`Number ${number}${isAlreadyBet ? ' (Already Taken)' : ''}`}
              >
                {number}
              </button>
            );
          })}
        </div>
        <div className="selected-numbers">
          Numbers Selected: {selectedNumbers.length > 0 ? selectedNumbers.join(", ") : "None"}
        </div>

        {/* Place Bet Button */}
        <button
          className="place-bet-button"
          onClick={handlePlaceBet}
          disabled={!isConnected || numberOfBets === 0 || isWritePending || isConfirming}
        >
           {/* Add Loading/Confirming states */}
           {isWritePending ? "Sending..." : isConfirming ? "Confirming..." : buttonText}
        </button>

        {/* Dissolve Game Button (Owner Only) */}
        {isOwner && (
          <button
            className="dissolve-button status-bar-field" // Use status-bar-field for potential styling
            onClick={handleDissolveGame}
            style={{ marginTop: '10px', backgroundColor: '#ffcccc' }} // Basic warning style
             disabled={isWritePending || isConfirming} // Disable during other txns
          >
            {isWritePending ? "Sending..." : isConfirming ? "Confirming..." : "Dissolve Game (Owner)"}
          </button>
        )}

      </div>
    </div>
  );
}

export default App;
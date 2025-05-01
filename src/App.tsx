import { useState, useEffect, useCallback } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from '@wagmi/connectors';
import { sdk as frameSdk } from '@farcaster/frame-sdk';
import './index.css';

// --- Contract Configuration ---
const NUMBER_BET_ADDRESS = '0x8256D1F0f9b17Ca075305a8439446f60b9351988' as const; // <-- NEWEST Address
const USDT_MOCK_ADDRESS = '0xEF37f57D8a64Fd6EdF2184Ad4b2c4Cd718ec4538' as const; // Mock USDT on Base Sepolia
const USDT_DECIMALS = 6;
const BET_AMOUNT_PER_NUMBER_WEI = 100000n; // 0.1 USDT with 6 decimals (as BigInt)

// ABI Snippets (Replace/add with your full ABI)
const NUMBER_BET_ABI = [
  // Constructor
  {
    "inputs": [ { "internalType": "address", "name": "_usdtTokenAddress", "type": "address" } ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  // Errors
  { "inputs": [ { "internalType": "uint8", "name": "number", "type": "uint8" } ], "name": "AlreadyBetOnNumber", "type": "error" },
  { "inputs": [], "name": "BettingNotActive", "type": "error" },
  { "inputs": [], "name": "BettingPeriodOver", "type": "error" },
  { "inputs": [], "name": "CannotDissolveActiveGame", "type": "error" },
  { "inputs": [], "name": "CooldownNotOver", "type": "error" },
  { "inputs": [], "name": "GameAlreadyEnded", "type": "error" },
  { "inputs": [], "name": "GameNotEndedYet", "type": "error" },
  { "inputs": [], "name": "GameNotInBettingState", "type": "error" },
  { "inputs": [], "name": "GameStillActive", "type": "error" },
  { "inputs": [], "name": "InsufficientAllowance", "type": "error" },
  { "inputs": [ { "internalType": "uint8", "name": "number", "type": "uint8" } ], "name": "InvalidNumber", "type": "error" },
  { "inputs": [], "name": "NoNumbersToBet", "type": "error" },
  { "inputs": [ { "internalType": "uint8", "name": "number", "type": "uint8" } ], "name": "NumberAlreadyBet", "type": "error" },
  { "inputs": [ { "internalType": "address", "name": "owner", "type": "address" } ], "name": "OwnableInvalidOwner", "type": "error" },
  { "inputs": [ { "internalType": "address", "name": "account", "type": "address" } ], "name": "OwnableUnauthorizedAccount", "type": "error" },
  { "inputs": [], "name": "ReentrancyGuardReentrantCall", "type": "error" },
  { "inputs": [], "name": "TransferFailed", "type": "error" },
  { "inputs": [], "name": "ZeroAddress", "type": "error" },
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint8[]", "name": "numbers", "type": "uint8[]" },
      { "indexed": false, "internalType": "uint256", "name": "totalAmount", "type": "uint256" }
    ],
    "name": "BetPlaced", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "totalAmount", "type": "uint256" }
    ],
    "name": "GameDissolved", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "endTime", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "poolAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint8", "name": "winningNumber", "type": "uint8" },
      { "indexed": true, "internalType": "address", "name": "winner", "type": "address" }
    ],
    "name": "GameEnded", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "endTime", "type": "uint256" }
    ],
    "name": "NewGameStarted", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }
    ],
    "name": "OwnershipTransferred", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "PlatformFeePaid", "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "winner", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "WinnerPaid", "type": "event"
  },
  // View Functions
  { "inputs": [], "name": "BET_AMOUNT_PER_NUMBER", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "COOLDOWN_DURATION", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "GAME_DURATION", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "MAX_NUMBER", "outputs": [ { "internalType": "uint8", "name": "", "type": "uint8" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "PLATFORM_FEE_PERCENT_BPS", "outputs": [ { "internalType": "uint16", "name": "", "type": "uint16" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint8", "name": "", "type": "uint8" } ], "name": "betsPlaced", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "cooldownEndTime", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "gameEndTime", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "gameState", "outputs": [ { "internalType": "enum NumberBet.GameState", "name": "", "type": "uint8" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getAllBetNumbers", "outputs": [ { "internalType": "uint8[]", "name": "", "type": "uint8[]" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint8", "name": "_number", "type": "uint8" } ], "name": "getBetStatus", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getCooldownEndTime", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getGameEndTime", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getGameState", "outputs": [ { "internalType": "enum NumberBet.GameState", "name": "", "type": "uint8" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "_user", "type": "address" } ], "name": "getUserBetNumbers", "outputs": [ { "internalType": "uint8[]", "name": "", "type": "uint8[]" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalPool", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "usdtToken", "outputs": [ { "internalType": "contract IERC20", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint8", "name": "", "type": "uint8" } ], "name": "userBets", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "view", "type": "function" },
  // State Changing Functions
  { "inputs": [], "name": "dissolveGame", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "endGame", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "uint8[]", "name": "_numbers", "type": "uint8[]" } ], "name": "placeBet", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "startGame", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "newOwner", "type": "address" } ], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
] as const; // Mark ABI as const for better type inference


const MOCK_USDT_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [ { "name": "", "type": "bool" } ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [ { "name": "", "type": "uint256" } ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;

enum GameState {
    Idle,
    Betting,
    Cooldown
}

// --- Utility Functions ---
const formatAddress = (address?: string): string => {
  if (!address) return 'Not Connected';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const formatBigInt = (value?: bigint, decimals: number = USDT_DECIMALS): string => {
  if (value === undefined || value === null) return 'Loading...';
  try {
      return formatUnits(value, decimals);
  } catch (e) {
      console.error("Error formatting BigInt:", e, "Value:", value);
      return "Error";
  }
};

// Helper to format countdown time
const formatTimeLeft = (targetTimestamp?: bigint): string => {
    if (!targetTimestamp) return "--:--:--";
    const now = BigInt(Math.floor(Date.now() / 1000));
    const timeLeftSeconds = targetTimestamp > now ? targetTimestamp - now : 0n;

    if (timeLeftSeconds === 0n) return "00:00:00";

    const hours = timeLeftSeconds / 3600n;
    const minutes = (timeLeftSeconds % 3600n) / 60n;
    const seconds = timeLeftSeconds % 60n;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


// --- Main App Component ---
function App() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isFrame, setIsFrame] = useState(false);

  // Check if running in Farcaster Frame context
   useEffect(() => {
    // Check if frameSdk object exists
    if (frameSdk && frameSdk.actions) {
        setIsFrame(true);
        // frameSdk.requestFrameContext(); // Removed: Method doesn't seem to exist / not needed now
        frameSdk.actions.ready(); // Signal the frame is ready
    } else {
        setIsFrame(false);
    }
  }, []);

   // --- Read Contract Data ---
   const { data: owner, refetch: refetchOwner } = useReadContract({
    address: NUMBER_BET_ADDRESS,
    abi: NUMBER_BET_ABI,
    functionName: 'owner',
  });

  const { data: totalPool, refetch: refetchTotalPool } = useReadContract({
    address: NUMBER_BET_ADDRESS,
    abi: NUMBER_BET_ABI,
    functionName: 'totalPool',
  });

  const { data: allBetNumbersData } = useReadContract({
    address: NUMBER_BET_ADDRESS,
    abi: NUMBER_BET_ABI,
    functionName: 'getAllBetNumbers',
  });
  const allBetNumbers: number[] = allBetNumbersData?.map(Number) ?? [];

  // --- New Timer/State Reads ---
  const { data: currentGameState, refetch: refetchGameState } = useReadContract({
    address: NUMBER_BET_ADDRESS,
    abi: NUMBER_BET_ABI,
    functionName: 'gameState',
  }); // Returns 0 (Idle), 1 (Betting), 2 (Cooldown)

  const { data: gameEndTime, refetch: refetchGameEndTime } = useReadContract({
    address: NUMBER_BET_ADDRESS,
    abi: NUMBER_BET_ABI,
    functionName: 'gameEndTime',
  });

  const { data: cooldownEndTime, refetch: refetchCooldownEndTime } = useReadContract({
    address: NUMBER_BET_ADDRESS,
    abi: NUMBER_BET_ABI,
    functionName: 'cooldownEndTime',
  });

  // --- Fetch User's Bets ---
  const { data: userBetNumbersData, refetch: refetchUserBetNumbers } = useReadContract({
      address: NUMBER_BET_ADDRESS,
      abi: NUMBER_BET_ABI,
      functionName: 'getUserBetNumbers',
      args: [address!], // Pass connected user's address
  });
  const userBetNumbers: number[] = userBetNumbersData?.map(Number) ?? [];

  // --- Refetch Logic ---
  const refetchAllContractData = useCallback(() => {
      console.log("Refetching all contract data...");
      refetchOwner();
      refetchTotalPool();
      refetchGameState();
      refetchGameEndTime();
      refetchCooldownEndTime();
      if (address) {
          refetchUserBetNumbers(); // Refetch user-specific bets
      }
  }, [address, refetchOwner, refetchTotalPool, refetchGameState, refetchGameEndTime, refetchCooldownEndTime, refetchUserBetNumbers]); // Added dependencies


  // --- USDT Allowance Check ---
  const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract({
    address: USDT_MOCK_ADDRESS,
    abi: MOCK_USDT_ABI,
    functionName: 'allowance',
    args: [address!, NUMBER_BET_ADDRESS], // User address, spender address
  });


  // --- Write Contract Hooks ---
  const { data: approveHash, writeContract: approveUsdt, isPending: isApprovePending, error: approveError } = useWriteContract();
  const { data: placeBetHash, writeContract: placeBet, isPending: isPlaceBetPending, error: placeBetError } = useWriteContract();
  const { data: dissolveHash, writeContract: dissolveGame, isPending: isDissolvePending, error: dissolveError } = useWriteContract();
  const { data: startHash, writeContract: startGame, isPending: isStartPending, error: startError } = useWriteContract();
  const { data: endHash, writeContract: endGame, isPending: isEndPending, error: endError } = useWriteContract();


   // --- Transaction Confirmation Logic (using useEffect) ---

   // Approval Transaction
   const { data: approveReceipt, isLoading: isApproving, isSuccess: isApproveSuccess, isError: isApproveError } = useWaitForTransactionReceipt({ hash: approveHash });
   useEffect(() => {
       if (isApproveSuccess && approveReceipt) {
           console.log('USDT Approved! Tx:', approveReceipt.transactionHash);
           refetchUsdtAllowance();
           handlePlaceBetInternal(); // Trigger placeBet after successful approval
       }
       if (isApproveError) {
           console.error('Approval Error:', approveError); // Use error from useWriteContract
           alert(`Approval failed: ${approveError?.message ?? 'Unknown error'}`);
       }
   }, [isApproveSuccess, isApproveError, approveReceipt, refetchUsdtAllowance, approveError]); // Add dependencies

   // Place Bet Transaction
   const { data: placeBetReceipt, isLoading: isPlacingBet, isSuccess: isPlaceBetSuccess, isError: isPlaceBetError } = useWaitForTransactionReceipt({ hash: placeBetHash });
    useEffect(() => {
        if (isPlaceBetSuccess && placeBetReceipt) {
            console.log('Bet Placed! Tx:', placeBetReceipt.transactionHash);
            alert('Bet Placed Successfully!');
            setSelectedNumbers([]); // Clear selection
            refetchAllContractData();
            refetchUsdtAllowance();
        }
        if (isPlaceBetError) {
            console.error('Place Bet Error:', placeBetError); // Use error from useWriteContract
            alert(`Placing bet failed: ${placeBetError?.message ?? 'Unknown error'}`);
            refetchAllContractData(); // Refetch state
        }
    }, [isPlaceBetSuccess, isPlaceBetError, placeBetReceipt, refetchAllContractData, refetchUsdtAllowance, placeBetError]);

   // Dissolve Game Transaction
   const { data: dissolveReceipt, isLoading: isDissolving, isSuccess: isDissolveSuccess, isError: isDissolveErrorHook } = useWaitForTransactionReceipt({ hash: dissolveHash });
    useEffect(() => {
        if (isDissolveSuccess && dissolveReceipt) {
            console.log('Game Dissolved! Tx:', dissolveReceipt.transactionHash);
            alert('Game Dissolved Successfully!');
            refetchAllContractData();
        }
        if (isDissolveErrorHook) {
            console.error('Dissolve Game Error:', dissolveError); // Use error from useWriteContract
            alert(`Dissolving game failed: ${dissolveError?.message ?? 'Unknown error'}`);
        }
    }, [isDissolveSuccess, isDissolveErrorHook, dissolveReceipt, refetchAllContractData, dissolveError]);

   // Start Game Transaction
   const { data: startReceipt, isLoading: isStarting, isSuccess: isStartSuccess, isError: isStartErrorHook } = useWaitForTransactionReceipt({ hash: startHash });
    useEffect(() => {
        if (isStartSuccess && startReceipt) {
            console.log('Game Started! Tx:', startReceipt.transactionHash);
            alert('New Game Started Successfully!');
            refetchAllContractData();
        }
        if (isStartErrorHook) {
            console.error('Start Game Error:', startError); // Use error from useWriteContract
            alert(`Starting game failed: ${startError?.message ?? 'Unknown error'}`);
        }
    }, [isStartSuccess, isStartErrorHook, startReceipt, refetchAllContractData, startError]);

    // End Game Transaction
    const { data: endReceipt, isLoading: isEnding, isSuccess: isEndSuccess, isError: isEndErrorHook } = useWaitForTransactionReceipt({ hash: endHash });
     useEffect(() => {
         if (isEndSuccess && endReceipt) {
             console.log('Game Ended! Tx:', endReceipt.transactionHash);
             alert('Betting Period Ended Successfully!');
             refetchAllContractData();
         }
         if (isEndErrorHook) {
             console.error('End Game Error:', endError); // Use error from useWriteContract
             alert(`Ending game failed: ${endError?.message ?? 'Unknown error'}`);
         }
     }, [isEndSuccess, isEndErrorHook, endReceipt, refetchAllContractData, endError]);

  // --- Event Handlers ---
  const handleConnectWallet = useCallback(() => {
    const farcasterConnector = connectors.find(c => c.id === 'farcasterFrame'); // Prioritize Farcaster connector
    const targetConnector = farcasterConnector || injected(); // Fallback to injected

    if (targetConnector) {
        connect({ connector: targetConnector });
    } else {
        console.error("No suitable connector found.");
        alert("Could not find a wallet connector. Please ensure MetaMask or a Farcaster context is available.");
    }
  }, [connect, connectors]);

  const handleDisconnectWallet = () => {
    disconnect();
  };

  const handleNumberClick = (num: number) => {
    // Prevent selecting taken numbers or during non-betting states
    if (allBetNumbers.includes(num) || currentGameState !== GameState.Betting) {
        return;
    }
    setSelectedNumbers(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  // Internal function called after successful approval
  const handlePlaceBetInternal = () => {
      if (!isConnected || !address) {
          alert('Please connect your wallet first.');
          return;
      }
      if (selectedNumbers.length === 0) {
          alert('Please select at least one number to bet.');
          return;
      }
       if (currentGameState !== GameState.Betting) {
          alert('Betting is not currently active.');
          return;
      }

      console.log("Placing bet for numbers:", selectedNumbers);
      placeBet({
          address: NUMBER_BET_ADDRESS,
          abi: NUMBER_BET_ABI,
          functionName: 'placeBet',
          args: [selectedNumbers],
      });
  };

  const handlePlaceBet = async () => {
      if (!isConnected || !address) {
          alert('Please connect your wallet first.');
          handleConnectWallet(); // Try to connect if not connected
          return;
      }
      if (selectedNumbers.length === 0) {
          alert('Please select at least one number to bet.');
          return;
      }
      if (currentGameState !== GameState.Betting) {
          alert('Betting is not currently active.');
          return;
      }

      const totalBetAmount = BigInt(selectedNumbers.length) * BET_AMOUNT_PER_NUMBER_WEI;
      console.log(`Checking allowance for ${formatBigInt(totalBetAmount)} USDT...`);
      console.log(`Current allowance: ${usdtAllowance ? formatBigInt(usdtAllowance) : 'Loading...'}`);


      if (usdtAllowance === undefined) {
          alert("Loading allowance... please wait and try again.");
          refetchUsdtAllowance(); // Trigger refetch
          return;
      }

      if (usdtAllowance < totalBetAmount) {
          console.log("Insufficient allowance. Requesting approval...");
          approveUsdt({
              address: USDT_MOCK_ADDRESS,
              abi: MOCK_USDT_ABI,
              functionName: 'approve',
              args: [NUMBER_BET_ADDRESS, totalBetAmount],
          });
      } else {
          console.log("Sufficient allowance found. Proceeding to place bet...");
          handlePlaceBetInternal(); // Directly call internal place bet
      }
  };


  const handleDissolveGame = () => {
     if (!isConnected || address !== owner) {
          alert('Only the owner can dissolve the game.');
          return;
      }
       if (currentGameState === GameState.Betting) {
           alert('Cannot dissolve the game while the betting period is active.');
           return;
       }
      if (window.confirm('Are you sure you want to dissolve the game and withdraw the pool? This cannot be undone.')) {
          dissolveGame({
              address: NUMBER_BET_ADDRESS,
              abi: NUMBER_BET_ABI,
              functionName: 'dissolveGame',
          });
      }
  };

   // --- New Timer Control Handlers ---
    const handleStartGame = () => {
        if (!isConnected || address !== owner) {
            alert('Only the owner can start the game.');
            return;
        }
        const now = BigInt(Math.floor(Date.now() / 1000));
        const isCooldownOver = cooldownEndTime ? now >= cooldownEndTime : true; // True if no cooldown set yet

        if (currentGameState === GameState.Idle || (currentGameState === GameState.Cooldown && isCooldownOver)) {
             if (window.confirm('Start a new 24-hour betting round?')) {
                startGame({
                    address: NUMBER_BET_ADDRESS,
                    abi: NUMBER_BET_ABI,
                    functionName: 'startGame',
                });
            }
        } else if (currentGameState === GameState.Betting) {
             alert('A game is already in progress.');
        } else if (currentGameState === GameState.Cooldown && !isCooldownOver) {
            alert(`Cooldown period active. New game can start in ${formatTimeLeft(cooldownEndTime)}.`);
        }
    };

    const handleEndGame = () => {
        if (!isConnected) {
             alert('Please connect your wallet to end the game.');
             return;
         }
        const now = BigInt(Math.floor(Date.now() / 1000));
        const isGameTimeOver = gameEndTime ? now >= gameEndTime : false;

        if (currentGameState !== GameState.Betting) {
            alert('The game is not in the betting state.');
            return;
        }
        if (!isGameTimeOver) {
            alert(`The betting period is still active. It ends in ${formatTimeLeft(gameEndTime)}.`);
            return;
        }

         if (window.confirm('End the current betting period and start the cooldown?')) {
            endGame({
                address: NUMBER_BET_ADDRESS,
                abi: NUMBER_BET_ABI,
                functionName: 'endGame',
            });
        }
    };


  // --- UI Rendering ---
  const isOwnerConnected = isConnected && address === owner;
  const isPlaceBetActionPending = isApprovePending || isApproving || isPlaceBetPending || isPlacingBet;

  // Calculate current time left for display (updates every second)
    const [displayTimeLeft, setDisplayTimeLeft] = useState("--:--:--");

    useEffect(() => {
        let targetTime: bigint | undefined;
        if (currentGameState === GameState.Betting) {
            targetTime = gameEndTime;
        } else if (currentGameState === GameState.Cooldown) {
            targetTime = cooldownEndTime;
        } else {
            targetTime = undefined;
        }

        if (targetTime) {
            const intervalId = setInterval(() => {
                const formattedTime = formatTimeLeft(targetTime);
                setDisplayTimeLeft(formattedTime);
                if (formattedTime === "00:00:00") {
                    clearInterval(intervalId);
                    // Optionally trigger a refetch when timer hits zero
                     refetchAllContractData();
                }
            }, 1000);
            // Initial calculation
             setDisplayTimeLeft(formatTimeLeft(targetTime));

            return () => clearInterval(intervalId); // Cleanup interval on unmount or state change
        } else {
            setDisplayTimeLeft("--:--:--"); // No active timer
        }
    }, [currentGameState, gameEndTime, cooldownEndTime, refetchAllContractData]);

  // Log isFrame to mark as used
  console.log('Frame Context:', isFrame);

  const getStatusText = (): string => {
      switch (currentGameState) {
          case GameState.Idle: return "Game Idle";
          case GameState.Betting: return `Betting Ends In: ${displayTimeLeft}`;
          case GameState.Cooldown: return `Cooldown Ends In: ${displayTimeLeft}`;
          default: return "Loading State...";
      }
  };

   const canStartGame = currentGameState === GameState.Idle || (currentGameState === GameState.Cooldown && (cooldownEndTime ? BigInt(Math.floor(Date.now() / 1000)) >= cooldownEndTime : true));
   const canEndGame = currentGameState === GameState.Betting && (gameEndTime ? BigInt(Math.floor(Date.now() / 1000)) >= gameEndTime : false);
   const canDissolve = currentGameState !== GameState.Betting;


  return (
    <div className="app-container window">
      <div className="title-bar">
        <div className="title-bar-text">Just Bet</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" />
          <button aria-label="Maximize" />
          <button aria-label="Close" />
        </div>
      </div>

      <div className="window-body">
         {/* Status and Wallet Info */}
         <div className="status-bar">
            <p className="status-bar-field">{getStatusText()}</p>
            <p className="status-bar-field">Pool: {formatBigInt(totalPool)} USDT</p>
             <p className="status-bar-field">Wallet: {formatAddress(address)}</p>
            {isConnected ? (
                <button onClick={handleDisconnectWallet} className="connect-button">Disconnect</button>
            ) : (
                <button onClick={handleConnectWallet} className="connect-button">Connect Wallet</button>
            )}
        </div>


        {/* Number Grid */}
        <div className="grid-container">
          {[...Array(100)].map((_, i) => {
            const num = i + 1;
            const isSelected = selectedNumbers.includes(num);
            const hasUserBet = userBetNumbers.includes(num);
            const isDisabled = hasUserBet || currentGameState !== GameState.Betting; // Disable if user already bet or not in betting state

            return (
              <button
                key={num}
                className={`grid-button ${isSelected ? 'selected' : ''} ${hasUserBet ? 'user-bet' : ''}`}
                onClick={() => handleNumberClick(num)}
                disabled={isDisabled}
                // eslint-disable-next-line react/jsx-boolean-value
                aria-pressed={isSelected}
                aria-label={`Number ${num}${hasUserBet ? ' (Your Bet)' : ''}${isSelected ? ' (Selected)' : ''}`}
              >
                {num}
              </button>
            );
          })}
        </div>

         {/* Betting Actions */}
         <div className="action-area field-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
             <div className="selected-numbers-display">
                Selected: {selectedNumbers.length > 0 ? selectedNumbers.join(', ') : 'None'}
             </div>
             <button
                onClick={handlePlaceBet}
                disabled={!isConnected || selectedNumbers.length === 0 || isPlaceBetActionPending || currentGameState !== GameState.Betting}
             >
                 {isApprovePending || isApproving ? 'Approving USDT...' :
                  isPlaceBetPending || isPlacingBet ? 'Placing Bet...' :
                  `Place Bet (${formatBigInt(BigInt(selectedNumbers.length) * BET_AMOUNT_PER_NUMBER_WEI)} USDT)`}
             </button>
         </div>

         {/* Admin/Game Control Actions */}
         <div className="admin-actions field-row" style={{ justifyContent: 'space-around', marginTop: '15px', borderTop: '1px solid grey', paddingTop: '10px' }}>
             {isOwnerConnected && (
                <button
                    onClick={handleStartGame}
                    disabled={!canStartGame || isStarting || isStartPending}
                >
                    {isStarting || isStartPending ? 'Starting Game...' : 'Start New Game'}
                </button>
            )}
             {/* Wrap End Betting Period button in owner check */}
             {isOwnerConnected && (
                 <button
                     onClick={handleEndGame}
                     disabled={!isConnected || !canEndGame || isEnding || isEndPending}
                 >
                     {isEnding || isEndPending ? 'Ending Period...' : 'End Betting Period'}
                 </button>
             )}

             {isOwnerConnected && (
                 <button
                    onClick={handleDissolveGame}
                    disabled={!canDissolve || isDissolving || isDissolvePending}
                 >
                     {isDissolving || isDissolvePending ? 'Dissolving...' : 'Dissolve Game'}
                 </button>
             )}
         </div>

           {/* Display Errors (Optional) */}
           <div className="error-display" style={{ color: 'red', marginTop: '10px', minHeight: '20px' }}>
                 {approveError && <p>Approval Error: {approveError.message}</p>}
                 {placeBetError && <p>Place Bet Error: {placeBetError.message}</p>}
                 {dissolveError && <p>Dissolve Error: {dissolveError.message}</p>}
                 {startError && <p>Start Game Error: {startError.message}</p>}
                 {endError && <p>End Game Error: {endError.message}</p>}
           </div>

      </div>
    </div>
  );
}

// Wrap App with QueryClientProvider
const queryClient = new QueryClient();

function WrappedApp() {
  // Wagmi config should be defined here or in main.tsx
  // Assuming WagmiProvider is wrapping this in main.tsx

  return (
    <QueryClientProvider client={queryClient}>
        <App />
    </QueryClientProvider>
  );
}

export default WrappedApp; // Export WrappedApp if WagmiProvider is outside
// export default App; // Export App directly if WagmiProvider is inside WrappedApp
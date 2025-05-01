// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NumberBet is Ownable, ReentrancyGuard {
    IERC20 public immutable usdtToken;
    uint256 public constant BET_AMOUNT_PER_NUMBER = 100_000; // 0.1 USDT with 6 decimals
    uint8 public constant MAX_NUMBER = 100;
    uint16 public constant PLATFORM_FEE_PERCENT_BPS = 100; // 100 BPS = 1% Platform Fee

    // Mappings
    mapping(uint8 => address) public betsPlaced;
    mapping(address => mapping(uint8 => bool)) public userBets;
    uint256 public totalPool;

    // Game State Enum
    enum GameState { Idle, Betting, Cooldown }
    GameState public gameState;

    // Game Timer State
    uint256 public constant GAME_DURATION = 24 hours;
    uint256 public constant COOLDOWN_DURATION = 1 hours;
    uint256 public gameEndTime;
    uint256 public cooldownEndTime;

    // Last Game Info (Optional)
    // uint8 public lastWinningNumber;
    // address public lastWinner;


    // --- Events ---
    event BetPlaced(address indexed player, uint8[] numbers, uint256 totalAmount);
    event GameDissolved(address indexed owner, uint256 totalAmount);
    event NewGameStarted(uint256 startTime, uint256 endTime);
    // Updated GameEnded event
    event GameEnded(uint256 endTime, uint256 poolAmount, uint8 winningNumber, address indexed winner);
    event PlatformFeePaid(address indexed recipient, uint256 amount);
    event WinnerPaid(address indexed winner, uint256 amount); // Includes owner if no bettor won

    // --- Errors ---
    error BettingNotActive();
    error BettingPeriodOver();
    error GameAlreadyEnded();
    error GameNotEndedYet();
    error GameStillActive();
    error CooldownNotOver();
    error GameNotInBettingState();
    error CannotDissolveActiveGame();
    error InvalidNumber(uint8 number);
    error NumberAlreadyBet(uint8 number);
    error AlreadyBetOnNumber(uint8 number);
    error NoNumbersToBet();
    error InsufficientAllowance();
    error TransferFailed();
    error ZeroAddress();


    constructor(address _usdtTokenAddress) Ownable(msg.sender) {
        if (_usdtTokenAddress == address(0)) revert ZeroAddress();
        usdtToken = IERC20(_usdtTokenAddress);
        gameState = GameState.Idle; // Start in Idle state
    }

    // --- Game Lifecycle Functions ---

    function startGame() external onlyOwner {
        if (gameState == GameState.Betting) revert GameStillActive();
        if (gameState == GameState.Cooldown && block.timestamp < cooldownEndTime) {
            revert CooldownNotOver();
        }

        // Reset necessary state for a new game
        // Clear bets from previous round (do this before starting new game)
        // Note: This loop can be gas-intensive if many numbers were bet.
        // Consider alternative designs for high-throughput games.
        for (uint8 i = 1; i <= MAX_NUMBER; i++) {
            address bettor = betsPlaced[i];
            if (bettor != address(0)) {
                userBets[bettor][i] = false; // Clear user's bet record for this number
                betsPlaced[i] = address(0); // Clear the main bet record
            }
        }
        // Reset pool (should be 0 already unless dissolve failed somehow)
        totalPool = 0;

        // Start new game
        gameState = GameState.Betting;
        gameEndTime = block.timestamp + GAME_DURATION;
        cooldownEndTime = 0; // Reset cooldown end time

        emit NewGameStarted(block.timestamp, gameEndTime);
    }

    function placeBet(uint8[] calldata _numbers) external nonReentrant {
        if (gameState != GameState.Betting) revert BettingNotActive();
        if (block.timestamp >= gameEndTime) revert BettingPeriodOver();

        uint256 len = _numbers.length;
        if (len == 0) revert NoNumbersToBet();

        uint256 totalBetRequired = len * BET_AMOUNT_PER_NUMBER;

        if (usdtToken.allowance(msg.sender, address(this)) < totalBetRequired) {
            revert InsufficientAllowance();
        }

        for (uint256 i = 0; i < len; i++) {
            uint8 number = _numbers[i];
            if (number == 0 || number > MAX_NUMBER) revert InvalidNumber(number);
            if (betsPlaced[number] != address(0)) revert NumberAlreadyBet(number);
            if (userBets[msg.sender][number]) revert AlreadyBetOnNumber(number);
        }

        bool success = usdtToken.transferFrom(msg.sender, address(this), totalBetRequired);
        if (!success) revert TransferFailed();

        for (uint256 i = 0; i < len; i++) {
             uint8 number = _numbers[i];
            betsPlaced[number] = msg.sender;
            userBets[msg.sender][number] = true;
        }

        totalPool += totalBetRequired;

        emit BetPlaced(msg.sender, _numbers, totalBetRequired);
    }

     function endGame() external nonReentrant {
        if (gameState != GameState.Betting) revert GameNotInBettingState();
        if (block.timestamp < gameEndTime) revert GameNotEndedYet();

        uint256 currentPool = totalPool;
        address platformRecipient = owner(); // Fee recipient is the contract owner

        // --- Winner Selection (INSECURE - DEMO ONLY) ---
        // DO NOT USE THIS IN PRODUCTION. It's predictable. Use Chainlink VRF for real randomness.
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1), // Use previous blockhash
            block.timestamp,
            msg.sender,
            currentPool
        )));
        uint8 winningNumber = uint8((randomSeed % MAX_NUMBER) + 1); // Result between 1 and 100
        // --- End Insecure Winner Selection ---

        address winnerAddress = betsPlaced[winningNumber];
        uint256 feeAmount = 0;
        uint256 payoutAmount = 0;

        // Reset pool *before* transfers
        totalPool = 0;

        if (currentPool > 0) {
            // Calculate and potentially pay fee
            feeAmount = (currentPool * PLATFORM_FEE_PERCENT_BPS) / 10000;
            if (feeAmount > 0) {
                 bool feeSuccess = usdtToken.transfer(platformRecipient, feeAmount);
                 if (!feeSuccess) {
                     totalPool = currentPool; // Revert pool amount if fee transfer fails
                     revert TransferFailed();
                 }
                 emit PlatformFeePaid(platformRecipient, feeAmount);
            }

            payoutAmount = currentPool - feeAmount; // Amount remaining for winner/owner

            if (payoutAmount > 0) {
                address finalRecipient;
                if (winnerAddress != address(0)) {
                    // Pay the winner
                    finalRecipient = winnerAddress;
                } else {
                    // No winner on the number, pay the owner
                    finalRecipient = owner();
                }

                bool payoutSuccess = usdtToken.transfer(finalRecipient, payoutAmount);
                if (!payoutSuccess) {
                     // Revert state if payout fails. Fee already sent.
                     // This is tricky. A pull pattern might be safer.
                     // For simplicity, we revert pool and assume transfers mostly succeed.
                     totalPool = currentPool; // Try to revert state
                     // Note: Fee is already paid and not reverted here.
                     revert TransferFailed();
                }
                 emit WinnerPaid(finalRecipient, payoutAmount);
            }
        }

        // Transition state
        gameState = GameState.Cooldown;
        cooldownEndTime = block.timestamp + COOLDOWN_DURATION;
        // gameEndTime remains the timestamp when this round ended.

        // Consider saving last winner/number if needed for UI
        // lastWinningNumber = winningNumber;
        // lastWinner = winnerAddress; // Could be address(0)

        emit GameEnded(gameEndTime, currentPool, winningNumber, winnerAddress); // Emit original pool amount
    }


    function dissolveGame() external onlyOwner nonReentrant {
        if (gameState == GameState.Betting) revert CannotDissolveActiveGame();

        uint256 currentPool = totalPool;

        // Reset state first
        gameState = GameState.Idle;
        gameEndTime = 0;
        cooldownEndTime = 0;
        totalPool = 0;

        // Clear all bets (can be gas intensive)
        for (uint8 i = 1; i <= MAX_NUMBER; i++) {
             address bettor = betsPlaced[i];
             if (bettor != address(0)) {
                 userBets[bettor][i] = false;
                 betsPlaced[i] = address(0);
             }
        }

        if (currentPool > 0) {
            bool success = usdtToken.transfer(owner(), currentPool);
            if (!success) {
                 // Attempt to revert state if transfer fails
                 // This is difficult to do perfectly without snapshots.
                 // Set state back to Cooldown/Idle depending on previous state? Assume Idle.
                 gameState = GameState.Idle; // Or previous state before dissolve call
                 totalPool = currentPool;
                 // Bets are already cleared, cannot easily revert that part here.
                 revert TransferFailed();
            }
        }

        emit GameDissolved(owner(), currentPool);
    }


    // --- View Functions ---

    function getGameState() external view returns (GameState) {
        return gameState;
    }

    function getGameEndTime() external view returns (uint256) {
        return gameEndTime;
    }

     function getCooldownEndTime() external view returns (uint256) {
        return cooldownEndTime;
    }

    function getBetStatus(uint8 _number) external view returns (address) {
        if (_number == 0 || _number > MAX_NUMBER) revert InvalidNumber(_number);
        return betsPlaced[_number];
    }

    function getUserBetNumbers(address _user) external view returns (uint8[] memory) {
        uint8 count = 0;
        for (uint8 i = 1; i <= MAX_NUMBER; i++) {
            if (userBets[_user][i]) {
                count++;
            }
        }

        uint8[] memory numbers = new uint8[](count);
        uint8 index = 0;
        for (uint8 i = 1; i <= MAX_NUMBER; i++) {
            if (userBets[_user][i]) {
                numbers[index] = i;
                index++;
            }
        }
        return numbers;
    }

     function getAllBetNumbers() external view returns (uint8[] memory) {
         uint8 count = 0;
         for (uint8 i = 1; i <= MAX_NUMBER; i++) {
             if (betsPlaced[i] != address(0)) {
                 count++;
             }
         }

         uint8[] memory numbers = new uint8[](count);
         uint8 index = 0;
         for (uint8 i = 1; i <= MAX_NUMBER; i++) {
             if (betsPlaced[i] != address(0)) {
                 numbers[index] = i;
                 index++;
             }
         }
         return numbers;
     }
} 
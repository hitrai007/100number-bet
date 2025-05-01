// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NumberBet is Ownable, ReentrancyGuard {
    IERC20 public immutable usdtToken;
    uint256 public constant BET_AMOUNT_PER_NUMBER = 100_000; // 0.1 USDT with 6 decimals
    uint8 public constant MAX_NUMBER = 100;

    // Mapping from number (1-100) to the address of the bettor
    mapping(uint8 => address) public betsPlaced;
    // Mapping from user address to mapping of numbers they bet on (true if bet)
    mapping(address => mapping(uint8 => bool)) public userBets;
    // Total USDT pooled in the contract
    uint256 public totalPool;

    event BetPlaced(address indexed player, uint8[] numbers, uint256 totalAmount);
    event GameDissolved(address indexed owner, uint256 totalAmount);

    error InvalidNumber(uint8 number);
    error NumberAlreadyBet(uint8 number);
    error AlreadyBetOnNumber(uint8 number);
    error NoNumbersToBet();
    error InsufficientAllowance();
    error TransferFailed();

    constructor(address _usdtTokenAddress) Ownable(msg.sender) {
        usdtToken = IERC20(_usdtTokenAddress);
    }

    function placeBet(uint8[] calldata _numbers) external nonReentrant {
        uint256 len = _numbers.length;
        if (len == 0) {
            revert NoNumbersToBet();
        }

        uint256 totalBetRequired = len * BET_AMOUNT_PER_NUMBER;

        // Check allowance first
        if (usdtToken.allowance(msg.sender, address(this)) < totalBetRequired) {
            revert InsufficientAllowance();
        }

        for (uint256 i = 0; i < len; i++) {
            uint8 number = _numbers[i];
            if (number == 0 || number > MAX_NUMBER) {
                revert InvalidNumber(number);
            }
            if (betsPlaced[number] != address(0)) {
                revert NumberAlreadyBet(number);
            }
            if (userBets[msg.sender][number]) {
                revert AlreadyBetOnNumber(number); // User already bet on this number
            }
        }

        // Transfer USDT
        bool success = usdtToken.transferFrom(msg.sender, address(this), totalBetRequired);
        if (!success) {
            revert TransferFailed();
        }

        // Update state after successful transfer
        for (uint256 i = 0; i < len; i++) {
             uint8 number = _numbers[i];
            betsPlaced[number] = msg.sender;
            userBets[msg.sender][number] = true;
        }

        totalPool += totalBetRequired;

        emit BetPlaced(msg.sender, _numbers, totalBetRequired);
    }

    function dissolveGame() external onlyOwner nonReentrant {
        uint256 currentPool = totalPool;
        if (currentPool == 0) {
            // Nothing to dissolve
            return;
        }

        totalPool = 0; // Set pool to zero before transfer

        // Reset state (consider gas implications for large number of bets)
        // This is simple but potentially expensive. Alternative: leave state, only withdraw.
        // For a simple game, reset is acceptable.
        for (uint8 i = 1; i <= MAX_NUMBER; i++) {
             address bettor = betsPlaced[i];
             if (bettor != address(0)) {
                 userBets[bettor][i] = false; // Clear user's bet record
                 betsPlaced[i] = address(0); // Clear the main bet record
             }
        }


        bool success = usdtToken.transfer(owner(), currentPool);
         if (!success) {
             // If transfer fails, revert state changes (including pool reset)
             totalPool = currentPool; // Revert pool amount
             // Reverting state reset is complex, could lead to inconsistent state.
             // Better to ensure transfer destination is valid or handle potential failure off-chain.
             // For simplicity, we assume owner address can receive tokens.
             // If concerned, could add checks or use pull pattern.
             revert TransferFailed();
        }


        emit GameDissolved(owner(), currentPool);
    }

    // --- View Functions ---

    function getBetStatus(uint8 _number) external view returns (address) {
        if (_number == 0 || _number > MAX_NUMBER) {
             revert InvalidNumber(_number);
         }
        return betsPlaced[_number];
    }

    // Get all numbers a specific user has bet on
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

     // Get all numbers currently bet on by anyone
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
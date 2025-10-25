// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title StakingPool
 * @dev A simple staking pool for testing SolidityGPT with DeFi patterns
 */
contract StakingPool {
    address public owner;
    uint256 public rewardRate = 100; // 1% per time unit
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 newRate);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    constructor() {
        owner = msg.sender;
        lastUpdateTime = block.timestamp;
    }

    function stake(uint256 amount) external payable updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        require(msg.value == amount, "Sent value must equal amount");

        totalStaked += amount;
        balanceOf[msg.sender] += amount;

        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        totalStaked -= amount;
        balanceOf[msg.sender] -= amount;

        // Transfer after state changes (reentrancy protection)
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards available");

        rewards[msg.sender] = 0;

        // Transfer after state changes (reentrancy protection)
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Reward transfer failed");

        emit RewardPaid(msg.sender, reward);
    }

    function exit() external {
        withdraw(balanceOf[msg.sender]);
        getReward();
    }

    function setRewardRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Rate must be positive");
        require(newRate <= 10000, "Rate too high"); // Max 100%

        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }

        uint256 timeElapsed = block.timestamp - lastUpdateTime;
        return rewardPerTokenStored + (timeElapsed * rewardRate * 1e18) / totalStaked;
    }

    function earned(address account) public view returns (uint256) {
        return
            (balanceOf[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) /
            1e18 +
            rewards[account];
    }

    function fundPool() external payable onlyOwner {
        require(msg.value > 0, "Must send funds");
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }

    receive() external payable {}
}

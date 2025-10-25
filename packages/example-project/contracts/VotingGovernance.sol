// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VotingGovernance
 * @dev A decentralized governance contract with voting, proposals, and timelock
 * @notice This contract demonstrates complex DeFi governance patterns for test generation
 */
contract VotingGovernance {
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
        mapping(address => bool) voteChoice; // true = for, false = against
    }

    // State variables
    address public admin;
    uint256 public proposalCount;
    uint256 public votingPeriod = 3 days;
    uint256 public timelockPeriod = 2 days;
    uint256 public quorumPercentage = 10; // 10% of total voting power
    uint256 public totalVotingPower;

    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;
    mapping(uint256 => uint256) public proposalExecutionTime;

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votes
    );

    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    event VotingPowerGranted(address indexed voter, uint256 amount);
    event VotingPowerRevoked(address indexed voter, uint256 amount);

    // Errors
    error Unauthorized();
    error InvalidProposal();
    error VotingClosed();
    error AlreadyVoted();
    error ProposalNotActive();
    error QuorumNotReached();
    error TimelockNotExpired();
    error ProposalAlreadyExecuted();
    error ZeroVotingPower();
    error InvalidQuorum();

    // Modifiers
    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    modifier proposalExists(uint256 proposalId) {
        if (proposalId == 0 || proposalId > proposalCount) revert InvalidProposal();
        _;
    }

    modifier proposalActive(uint256 proposalId) {
        Proposal storage proposal = proposals[proposalId];
        if (block.timestamp < proposal.startTime || block.timestamp > proposal.endTime) {
            revert ProposalNotActive();
        }
        if (proposal.executed || proposal.canceled) revert ProposalNotActive();
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Grant voting power to an address
     * @param voter Address to grant voting power to
     * @param amount Amount of voting power to grant
     */
    function grantVotingPower(address voter, uint256 amount) external onlyAdmin {
        if (voter == address(0)) revert Unauthorized();
        if (amount == 0) revert ZeroVotingPower();

        votingPower[voter] += amount;
        totalVotingPower += amount;

        emit VotingPowerGranted(voter, amount);
    }

    /**
     * @notice Revoke voting power from an address
     * @param voter Address to revoke voting power from
     * @param amount Amount of voting power to revoke
     */
    function revokeVotingPower(address voter, uint256 amount) external onlyAdmin {
        if (votingPower[voter] < amount) revert ZeroVotingPower();

        votingPower[voter] -= amount;
        totalVotingPower -= amount;

        emit VotingPowerRevoked(voter, amount);
    }

    /**
     * @notice Create a new proposal
     * @param description Description of the proposal
     * @return proposalId The ID of the created proposal
     */
    function createProposal(string memory description) external returns (uint256) {
        if (votingPower[msg.sender] == 0) revert ZeroVotingPower();

        proposalCount++;
        uint256 proposalId = proposalCount;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        proposal.executed = false;
        proposal.canceled = false;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            description,
            proposal.startTime,
            proposal.endTime
        );

        return proposalId;
    }

    /**
     * @notice Cast a vote on a proposal
     * @param proposalId ID of the proposal to vote on
     * @param support True to vote for, false to vote against
     */
    function castVote(
        uint256 proposalId,
        bool support
    ) external proposalExists(proposalId) proposalActive(proposalId) {
        if (votingPower[msg.sender] == 0) revert ZeroVotingPower();

        Proposal storage proposal = proposals[proposalId];

        if (proposal.hasVoted[msg.sender]) revert AlreadyVoted();

        proposal.hasVoted[msg.sender] = true;
        proposal.voteChoice[msg.sender] = support;

        uint256 votes = votingPower[msg.sender];

        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }

        emit VoteCast(proposalId, msg.sender, support, votes);
    }

    /**
     * @notice Queue a proposal for execution after voting ends
     * @param proposalId ID of the proposal to queue
     */
    function queueProposal(uint256 proposalId) external proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];

        if (block.timestamp <= proposal.endTime) revert VotingClosed();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.canceled) revert InvalidProposal();

        // Check quorum
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 quorum = (totalVotingPower * quorumPercentage) / 100;

        if (totalVotes < quorum) revert QuorumNotReached();

        // Check if proposal passed
        if (proposal.forVotes <= proposal.againstVotes) revert InvalidProposal();

        // Set execution time
        proposalExecutionTime[proposalId] = block.timestamp + timelockPeriod;
    }

    /**
     * @notice Execute a queued proposal
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.canceled) revert InvalidProposal();

        uint256 executionTime = proposalExecutionTime[proposalId];
        if (executionTime == 0 || block.timestamp < executionTime) {
            revert TimelockNotExpired();
        }

        proposal.executed = true;

        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Cancel a proposal (only admin)
     * @param proposalId ID of the proposal to cancel
     */
    function cancelProposal(
        uint256 proposalId
    ) external onlyAdmin proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.canceled) revert InvalidProposal();

        proposal.canceled = true;

        emit ProposalCanceled(proposalId);
    }

    /**
     * @notice Update quorum percentage (only admin)
     * @param newQuorum New quorum percentage (0-100)
     */
    function updateQuorum(uint256 newQuorum) external onlyAdmin {
        if (newQuorum == 0 || newQuorum > 100) revert InvalidQuorum();
        quorumPercentage = newQuorum;
    }

    /**
     * @notice Get proposal details
     * @param proposalId ID of the proposal
     * @return id Proposal ID
     * @return proposer Address of proposer
     * @return description Proposal description
     * @return forVotes Votes in favor
     * @return againstVotes Votes against
     * @return startTime Voting start time
     * @return endTime Voting end time
     * @return executed Whether proposal was executed
     * @return canceled Whether proposal was canceled
     */
    function getProposal(
        uint256 proposalId
    )
        external
        view
        proposalExists(proposalId)
        returns (
            uint256 id,
            address proposer,
            string memory description,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            bool canceled
        )
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.canceled
        );
    }

    /**
     * @notice Check if an address has voted on a proposal
     * @param proposalId ID of the proposal
     * @param voter Address to check
     * @return hasVoted Whether the address has voted
     * @return voteChoice The vote choice (true = for, false = against)
     */
    function getVote(
        uint256 proposalId,
        address voter
    )
        external
        view
        proposalExists(proposalId)
        returns (bool hasVoted, bool voteChoice)
    {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.hasVoted[voter], proposal.voteChoice[voter]);
    }

    /**
     * @notice Get current quorum threshold
     * @return The number of votes required for quorum
     */
    function getQuorumThreshold() external view returns (uint256) {
        return (totalVotingPower * quorumPercentage) / 100;
    }

    /**
     * @notice Check if a proposal has reached quorum
     * @param proposalId ID of the proposal
     * @return Whether quorum has been reached
     */
    function hasReachedQuorum(
        uint256 proposalId
    ) external view proposalExists(proposalId) returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 quorum = (totalVotingPower * quorumPercentage) / 100;
        return totalVotes >= quorum;
    }

    /**
     * @notice Transfer admin rights (only admin)
     * @param newAdmin Address of new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert Unauthorized();
        admin = newAdmin;
    }
}

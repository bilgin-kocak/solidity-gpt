// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title MultiSigWallet
 * @dev A simple multi-signature wallet for testing SolidityGPT
 */
contract MultiSigWallet {
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
    }

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;

    event Deposit(address indexed sender, uint256 amount);
    event Submission(uint256 indexed txIndex);
    event Confirmation(address indexed owner, uint256 indexed txIndex);
    event Revocation(address indexed owner, uint256 indexed txIndex);
    event Execution(uint256 indexed txIndex);
    event ExecutionFailure(uint256 indexed txIndex);

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    modifier txExists(uint256 txIndex) {
        require(txIndex < transactions.length, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 txIndex) {
        require(!transactions[txIndex].executed, "Transaction already executed");
        _;
    }

    modifier notConfirmed(uint256 txIndex) {
        require(!confirmations[txIndex][msg.sender], "Transaction already confirmed");
        _;
    }

    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "Owners required");
        require(_required > 0 && _required <= _owners.length, "Invalid required number");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        required = _required;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function submitTransaction(
        address to,
        uint256 value,
        bytes memory data
    ) public onlyOwner returns (uint256) {
        require(to != address(0), "Invalid destination address");

        uint256 txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: to,
                value: value,
                data: data,
                executed: false,
                confirmations: 0
            })
        );

        emit Submission(txIndex);

        // Automatically confirm from submitter
        confirmTransaction(txIndex);

        return txIndex;
    }

    function confirmTransaction(uint256 txIndex)
        public
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
        notConfirmed(txIndex)
    {
        confirmations[txIndex][msg.sender] = true;
        transactions[txIndex].confirmations++;

        emit Confirmation(msg.sender, txIndex);

        // Auto-execute if threshold reached
        if (isConfirmed(txIndex)) {
            executeTransaction(txIndex);
        }
    }

    function revokeConfirmation(uint256 txIndex)
        public
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
    {
        require(confirmations[txIndex][msg.sender], "Transaction not confirmed");

        confirmations[txIndex][msg.sender] = false;
        transactions[txIndex].confirmations--;

        emit Revocation(msg.sender, txIndex);
    }

    function executeTransaction(uint256 txIndex)
        public
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
    {
        require(isConfirmed(txIndex), "Not enough confirmations");

        Transaction storage txn = transactions[txIndex];
        txn.executed = true;

        (bool success, ) = txn.to.call{value: txn.value}(txn.data);

        if (success) {
            emit Execution(txIndex);
        } else {
            emit ExecutionFailure(txIndex);
            txn.executed = false;
        }
    }

    function isConfirmed(uint256 txIndex) public view returns (bool) {
        return transactions[txIndex].confirmations >= required;
    }

    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(uint256 txIndex)
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 confirmationCount
        )
    {
        Transaction storage txn = transactions[txIndex];
        return (txn.to, txn.value, txn.data, txn.executed, txn.confirmations);
    }

    function getConfirmationCount(uint256 txIndex) public view returns (uint256) {
        return transactions[txIndex].confirmations;
    }

    function hasConfirmed(uint256 txIndex, address owner) public view returns (bool) {
        return confirmations[txIndex][owner];
    }
}

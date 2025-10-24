// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SimpleNFT
 * @dev A simple ERC721-like NFT contract for testing SolidityGPT
 */
contract SimpleNFT {
    string public name = "Simple NFT";
    string public symbol = "SNFT";

    uint256 private _tokenIdCounter;
    address public owner;

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(uint256 => string) public tokenURI;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function mint(address to, string memory uri) public onlyOwner returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");

        uint256 tokenId = _tokenIdCounter++;
        ownerOf[tokenId] = to;
        balanceOf[to]++;
        tokenURI[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }

    function transfer(address to, uint256 tokenId) public {
        require(to != address(0), "Cannot transfer to zero address");
        require(ownerOf[tokenId] == msg.sender, "Not the owner of this token");

        _transfer(msg.sender, to, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(to != address(0), "Cannot transfer to zero address");
        require(ownerOf[tokenId] == from, "From address is not the owner");
        require(
            msg.sender == from ||
            getApproved[tokenId] == msg.sender ||
            isApprovedForAll[from][msg.sender],
            "Not authorized to transfer"
        );

        _transfer(from, to, tokenId);
    }

    function approve(address to, uint256 tokenId) public {
        address tokenOwner = ownerOf[tokenId];
        require(msg.sender == tokenOwner || isApprovedForAll[tokenOwner][msg.sender],
            "Not authorized to approve");

        getApproved[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) public {
        require(operator != msg.sender, "Cannot approve self");
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function burn(uint256 tokenId) public {
        require(ownerOf[tokenId] == msg.sender, "Not the owner of this token");

        _burn(tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        balanceOf[from]--;
        balanceOf[to]++;
        ownerOf[tokenId] = to;

        // Clear approval
        delete getApproved[tokenId];

        emit Transfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) internal {
        address tokenOwner = ownerOf[tokenId];

        balanceOf[tokenOwner]--;
        delete ownerOf[tokenId];
        delete getApproved[tokenId];
        delete tokenURI[tokenId];

        emit Transfer(tokenOwner, address(0), tokenId);
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return ownerOf[tokenId] != address(0);
    }
}

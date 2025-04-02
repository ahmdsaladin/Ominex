// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract DataControl is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    struct UserData {
        string publicKey;
        bool isActive;
        uint256 lastAccess;
        uint256 dataAccessCount;
        mapping(bytes32 => bool) accessLogs;
    }

    struct DataAccess {
        bytes32 accessHash;
        uint256 timestamp;
        string accessType;
        string dataType;
    }

    mapping(address => UserData) public users;
    mapping(address => DataAccess[]) public accessHistory;
    mapping(bytes32 => bool) public revokedAccess;

    event UserRegistered(address indexed user, string publicKey);
    event AccessGranted(address indexed user, bytes32 accessHash);
    event AccessRevoked(address indexed user, bytes32 accessHash);
    event DataDeleted(address indexed user);

    modifier onlyRegisteredUser() {
        require(users[msg.sender].isActive, "User not registered");
        _;
    }

    function registerUser(string memory publicKey) external {
        require(!users[msg.sender].isActive, "User already registered");
        users[msg.sender] = UserData({
            publicKey: publicKey,
            isActive: true,
            lastAccess: block.timestamp,
            dataAccessCount: 0
        });
        emit UserRegistered(msg.sender, publicKey);
    }

    function setUserPublicKey(string memory publicKey) external onlyRegisteredUser {
        users[msg.sender].publicKey = publicKey;
    }

    function logDataAccess(bytes32 accessHash) external onlyRegisteredUser {
        require(!revokedAccess[accessHash], "Access already revoked");
        users[msg.sender].accessLogs[accessHash] = true;
        users[msg.sender].lastAccess = block.timestamp;
        users[msg.sender].dataAccessCount++;

        accessHistory[msg.sender].push(DataAccess({
            accessHash: accessHash,
            timestamp: block.timestamp,
            accessType: "read",
            dataType: "user_data"
        }));

        emit AccessGranted(msg.sender, accessHash);
    }

    function revokeAccess(bytes32 accessHash) external onlyRegisteredUser {
        require(users[msg.sender].accessLogs[accessHash], "Access not found");
        revokedAccess[accessHash] = true;
        emit AccessRevoked(msg.sender, accessHash);
    }

    function getUserActivity() external view onlyRegisteredUser returns (DataAccess[] memory) {
        return accessHistory[msg.sender];
    }

    function verifyAccess(bytes32 accessHash, bytes memory signature) external view returns (bool) {
        address signer = keccak256(abi.encodePacked(accessHash)).toEthSignedMessageHash().recover(signature);
        return users[signer].accessLogs[accessHash] && !revokedAccess[accessHash];
    }

    function requestDataDeletion() external onlyRegisteredUser {
        // Mark all access logs as revoked
        DataAccess[] storage history = accessHistory[msg.sender];
        for (uint i = 0; i < history.length; i++) {
            revokedAccess[history[i].accessHash] = true;
        }

        // Clear user data
        delete users[msg.sender];
        delete accessHistory[msg.sender];

        emit DataDeleted(msg.sender);
    }

    function getAccessCount() external view onlyRegisteredUser returns (uint256) {
        return users[msg.sender].dataAccessCount;
    }

    function getLastAccess() external view onlyRegisteredUser returns (uint256) {
        return users[msg.sender].lastAccess;
    }
} 
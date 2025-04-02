// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Auth is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    struct UserIdentity {
        string publicKey;
        string biometricHash;
        bool isActive;
        uint256 lastAuth;
        uint256 authCount;
        mapping(string => bool) verifiedPlatforms;
    }

    struct AuthSession {
        bytes32 sessionId;
        uint256 timestamp;
        string platform;
        bool isValid;
    }

    mapping(address => UserIdentity) public identities;
    mapping(bytes32 => AuthSession) public sessions;
    mapping(string => bool) public revokedSessions;

    event IdentityRegistered(address indexed user, string publicKey);
    event IdentityVerified(address indexed user, string platform);
    event SessionCreated(address indexed user, bytes32 sessionId);
    event SessionRevoked(address indexed user, bytes32 sessionId);
    event BiometricUpdated(address indexed user);

    modifier onlyRegisteredUser() {
        require(identities[msg.sender].isActive, "User not registered");
        _;
    }

    function registerIdentity(string memory publicKey) external {
        require(!identities[msg.sender].isActive, "Identity already registered");
        identities[msg.sender] = UserIdentity({
            publicKey: publicKey,
            biometricHash: "",
            isActive: true,
            lastAuth: block.timestamp,
            authCount: 0
        });
        emit IdentityRegistered(msg.sender, publicKey);
    }

    function setBiometricHash(string memory biometricHash) external onlyRegisteredUser {
        identities[msg.sender].biometricHash = biometricHash;
        emit BiometricUpdated(msg.sender);
    }

    function verifyPlatform(string memory platform, bytes memory signature) external onlyRegisteredUser {
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, platform));
        address signer = messageHash.toEthSignedMessageHash().recover(signature);
        
        require(signer == msg.sender, "Invalid signature");
        identities[msg.sender].verifiedPlatforms[platform] = true;
        emit IdentityVerified(msg.sender, platform);
    }

    function createSession(string memory platform) external onlyRegisteredUser returns (bytes32) {
        require(identities[msg.sender].verifiedPlatforms[platform], "Platform not verified");
        
        bytes32 sessionId = keccak256(abi.encodePacked(
            msg.sender,
            platform,
            block.timestamp,
            block.difficulty
        ));

        sessions[sessionId] = AuthSession({
            sessionId: sessionId,
            timestamp: block.timestamp,
            platform: platform,
            isValid: true
        });

        identities[msg.sender].lastAuth = block.timestamp;
        identities[msg.sender].authCount++;

        emit SessionCreated(msg.sender, sessionId);
        return sessionId;
    }

    function revokeSession(bytes32 sessionId) external onlyRegisteredUser {
        require(sessions[sessionId].isValid, "Session not found");
        sessions[sessionId].isValid = false;
        revokedSessions[sessionId.toHexString()] = true;
        emit SessionRevoked(msg.sender, sessionId);
    }

    function verifySession(bytes32 sessionId, bytes memory signature) external view returns (bool) {
        if (!sessions[sessionId].isValid || revokedSessions[sessionId.toHexString()]) {
            return false;
        }

        bytes32 messageHash = keccak256(abi.encodePacked(sessionId));
        address signer = messageHash.toEthSignedMessageHash().recover(signature);
        
        return identities[signer].isActive && 
               identities[signer].verifiedPlatforms[sessions[sessionId].platform];
    }

    function getSessionInfo(bytes32 sessionId) external view returns (
        uint256 timestamp,
        string memory platform,
        bool isValid
    ) {
        AuthSession storage session = sessions[sessionId];
        return (session.timestamp, session.platform, session.isValid);
    }

    function getIdentityInfo() external view onlyRegisteredUser returns (
        string memory publicKey,
        bool hasBiometric,
        uint256 lastAuth,
        uint256 authCount
    ) {
        UserIdentity storage identity = identities[msg.sender];
        return (
            identity.publicKey,
            bytes(identity.biometricHash).length > 0,
            identity.lastAuth,
            identity.authCount
        );
    }

    function getVerifiedPlatforms() external view onlyRegisteredUser returns (string[] memory) {
        UserIdentity storage identity = identities[msg.sender];
        // Implementation to return array of verified platforms
        // This is a placeholder - actual implementation would need to track platforms
        return new string[](0);
    }
} 
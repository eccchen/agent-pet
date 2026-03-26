// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICannedToken {
    function mint(address to, uint256 amount) external;
}

contract CannedClaimVault {
    ICannedToken public immutable token;
    address public owner;

    mapping(address => bool) public isClaimSigner;
    mapping(bytes32 => bool) public isClaimUsed;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ClaimSignerSet(address indexed signer, bool allowed);
    event Claimed(
        bytes32 indexed claimId,
        address indexed recipient,
        uint256 amount,
        address indexed signer,
        uint256 expiry
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address tokenAddress, address initialClaimSigner) {
        require(tokenAddress != address(0), "Token required");
        require(initialClaimSigner != address(0), "Signer required");

        token = ICannedToken(tokenAddress);
        owner = msg.sender;
        isClaimSigner[initialClaimSigner] = true;

        emit OwnershipTransferred(address(0), msg.sender);
        emit ClaimSignerSet(initialClaimSigner, true);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Owner required");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setClaimSigner(address signer, bool allowed) external onlyOwner {
        require(signer != address(0), "Signer required");
        isClaimSigner[signer] = allowed;
        emit ClaimSignerSet(signer, allowed);
    }

    function claim(bytes32 claimId, uint256 amount, uint256 expiry, bytes calldata signature) external {
        require(amount > 0, "Amount required");
        require(block.timestamp <= expiry, "Claim expired");
        require(!isClaimUsed[claimId], "Claim already used");

        bytes32 digest = keccak256(
            abi.encode(block.chainid, address(this), msg.sender, claimId, amount, expiry)
        );
        address recoveredSigner = _recoverSigner(_toEthSignedMessageHash(digest), signature);
        require(isClaimSigner[recoveredSigner], "Invalid claim signer");

        isClaimUsed[claimId] = true;
        token.mint(msg.sender, amount);

        emit Claimed(claimId, msg.sender, amount, recoveredSigner, expiry);
    }

    function _toEthSignedMessageHash(bytes32 digest) private pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));
    }

    function _recoverSigner(bytes32 digest, bytes calldata signature) private pure returns (address) {
        require(signature.length == 65, "Invalid signature");

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) {
            v += 27;
        }
        require(v == 27 || v == 28, "Invalid signature");

        address recovered = ecrecover(digest, v, r, s);
        require(recovered != address(0), "Invalid signature");
        return recovered;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title LeaderboardRegistry
/// @notice Haftalık leaderboard (epoch) için Merkle root tutar.
/// @dev OZ v5: Ownable(initialOwner) bekler. Deploy sırasında owner adresini verin.
contract LeaderboardRegistry is Ownable {
    /// @notice epoch => merkleRoot
    mapping(uint256 => bytes32) public merkleRoots;

    event RootUpdated(uint256 indexed epoch, bytes32 indexed root);

    /// @param initialOwner Kontrat sahibi
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Haftalık leaderboard kökünü set eder.
    /// @param epoch Haftayı temsil eden id (örn. hafta sayacı ya da haftanın başlangıç timestamp’i)
    /// @param root Merkle kökü
    function setRoot(uint256 epoch, bytes32 root) external onlyOwner {
        merkleRoots[epoch] = root;
        emit RootUpdated(epoch, root);
    }

    /// @notice Kökü döndürür (opsiyonel convenience)
    function getRoot(uint256 epoch) external view returns (bytes32) {
        return merkleRoots[epoch];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MonadCommunityTipRail
/// @notice Tek bir işlemde tekli veya çoklu bahşiş (MON native coin) gönderimi.
/// @dev Gelen TipItem[] array uzunluğu 1 ise single tip, >1 ise batch tip çalışır.
contract MonadCommunityTipRail is ReentrancyGuard, Pausable, Ownable {
    struct TipItem {
        address recipient;
        uint256 amount;   // brüt (kesinti öncesi)
    }

    /// @notice Kesinti oranı (bps formatında). 200 = %2
    uint256 public feeBps = 200;
    address public treasury;

    event TippedNative(
        address indexed sender,
        address indexed recipient,
        uint256 grossAmount,
        uint256 feeAmount,
        uint256 netAmount
    );

    event BatchExecuted(
        address indexed sender,
        uint256 totalGross,
        uint256 totalFee,
        uint256 recipientsCount
    );

    constructor(address initialOwner, address _treasury) Ownable(initialOwner) {
        require(_treasury != address(0), "treasury=0");
        treasury = _treasury;
    }

    // --------------------------
    // Admin
    // --------------------------
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "treasury=0");
        treasury = _treasury;
    }

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "fee too high"); // max %10
        feeBps = _feeBps;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // --------------------------
    // Tekli & Çoklu Tip (Unified)
    // --------------------------
    /// @notice Tek veya çoklu kişiye tip gönderimi
    /// @dev msg.value toplamı = tüm amounts toplamı olmalı
    function tipBatchNative(TipItem[] calldata items)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        uint256 len = items.length;
        require(len > 0, "empty");

        uint256 grossSum = 0;
        uint256 feeSum = 0;

        unchecked {
            for (uint256 i = 0; i < len; i++) {
                grossSum += items[i].amount;
            }
        }
        require(msg.value == grossSum, "bad msg.value");

        for (uint256 i = 0; i < len; i++) {
            TipItem calldata it = items[i];
            require(it.recipient != address(0), "recipient=0");

            uint256 fee = (it.amount * feeBps) / 10_000;
            uint256 net = it.amount - fee;
            feeSum += fee;

            (bool ok, ) = it.recipient.call{value: net}("");
            require(ok, "native transfer failed");

            emit TippedNative(msg.sender, it.recipient, it.amount, fee, net);
        }

        if (feeSum > 0) {
            (bool ok2, ) = payable(treasury).call{value: feeSum}("");
            require(ok2, "fee transfer failed");
        }

        emit BatchExecuted(msg.sender, grossSum, feeSum, len);
    }

    // rescue
    function rescueNative(address payable to, uint256 amount) external onlyOwner {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "rescue fail");
    }

    receive() external payable {}
}

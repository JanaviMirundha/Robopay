// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RoboPay {

    struct Payment {
        string orderId;
        string robotId;
        string service;
        uint256 durationMinutes;
        uint256 amountInr;
        bytes32 paymentHash;
        uint256 timestamp;
        bool verified;
    }

    address public owner;

    mapping(string => Payment) private payments;

    event PaymentRecorded(
        string orderId,
        string robotId,
        string service,
        uint256 durationMinutes,
        uint256 amountInr,
        bytes32 paymentHash,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function recordPayment(
        string calldata orderId,
        string calldata robotId,
        string calldata service,
        uint256 durationMinutes,
        uint256 amountInr,
        bytes32 paymentHash
    ) external onlyOwner {

        payments[orderId] = Payment({
            orderId: orderId,
            robotId: robotId,
            service: service,
            durationMinutes: durationMinutes,
            amountInr: amountInr,
            paymentHash: paymentHash,
            timestamp: block.timestamp,
            verified: true
        });

        emit PaymentRecorded(
            orderId,
            robotId,
            service,
            durationMinutes,
            amountInr,
            paymentHash,
            block.timestamp
        );
    }

    function getPayment(
        string calldata orderId
    )
        external
        view
        returns (
            string memory,
            string memory,
            string memory,
            uint256,
            uint256,
            bytes32,
            uint256,
            bool
        )
    {
        Payment memory payment = payments[orderId];

        return (
            payment.orderId,
            payment.robotId,
            payment.service,
            payment.durationMinutes,
            payment.amountInr,
            payment.paymentHash,
            payment.timestamp,
            payment.verified
        );
    }
}
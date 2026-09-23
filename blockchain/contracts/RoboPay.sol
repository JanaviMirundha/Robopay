// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RoboPay {

    struct Rental {
        string orderId;
        string robotId;
        string service;
        uint256 durationMinutes;
        uint256 amountInr;
        uint256 amountPaidWei;
        address customer;
        uint256 startTime;
        bool active;
    }

    address public owner;
    address payable public immutable paymentRecipient;

    mapping(string => Rental) private rentals;

    event RentalCreated(
        string indexed orderId,
        string robotId,
        string service,
        uint256 durationMinutes,
        uint256 amountInr,
        uint256 amountPaidWei,
        address indexed customer,
        uint256 startTime
    );

    event RentalEnded(
        string indexed orderId,
        uint256 endTime
    );

    constructor(address payable _paymentRecipient) {
        require(
            _paymentRecipient != address(0),
            "Invalid payment recipient"
        );

        owner = msg.sender;
        paymentRecipient = _paymentRecipient;
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Not contract owner"
        );
        _;
    }

    // =====================================================
    // INR PACKAGE PRICE
    // =====================================================

    function requiredAmountInr(
        string calldata robotId,
        uint256 durationMinutes
    ) public pure returns (uint256) {

        bytes32 robotHash =
            keccak256(bytes(robotId));

        // RoboFollow
        if (
            robotHash ==
            keccak256(bytes("RF-01"))
        ) {
            if (durationMinutes == 10) {
                return 20;
            }

            if (durationMinutes == 20) {
                return 40;
            }

            if (durationMinutes == 30) {
                return 60;
            }
        }

        // RoboClean
        if (
            robotHash ==
            keccak256(bytes("FC-01"))
        ) {
            if (durationMinutes == 10) {
                return 20;
            }
        }

        // RoboTrolley
        if (
            robotHash ==
            keccak256(bytes("ST-01"))
        ) {
            if (durationMinutes == 30) {
                return 30;
            }
        }

        revert(
            "Invalid robot or package"
        );
    }

    // =====================================================
    // BASE SEPOLIA ETH PACKAGE PRICE
    // =====================================================

    function requiredPayment(
        string calldata robotId,
        uint256 durationMinutes
    ) public pure returns (uint256) {

        bytes32 robotHash =
            keccak256(bytes(robotId));

        // RoboFollow
        if (
            robotHash ==
            keccak256(bytes("RF-01"))
        ) {
            if (durationMinutes == 10) {
                return 10000000000000; // 0.00001 ETH
            }

            if (durationMinutes == 20) {
                return 20000000000000; // 0.00002 ETH
            }

            if (durationMinutes == 30) {
                return 30000000000000; // 0.00003 ETH
            }
        }

        // RoboClean
        if (
            robotHash ==
            keccak256(bytes("FC-01"))
        ) {
            if (durationMinutes == 10) {
                return 10000000000000; // 0.00001 ETH
            }
        }

        // RoboTrolley
        if (
            robotHash ==
            keccak256(bytes("ST-01"))
        ) {
            if (durationMinutes == 30) {
                return 15000000000000; // 0.000015 ETH
            }
        }

        revert(
            "Invalid robot or package"
        );
    }

    // =====================================================
    // CUSTOMER RENTAL PAYMENT
    // =====================================================

    function rentRobot(
        string calldata orderId,
        string calldata robotId,
        string calldata service,
        uint256 durationMinutes,
        uint256 amountInr
    ) external payable {

        require(
            bytes(orderId).length > 0,
            "Invalid order ID"
        );

        require(
            bytes(robotId).length > 0,
            "Invalid robot ID"
        );

        require(
            rentals[orderId].customer == address(0),
            "Order already exists"
        );

        uint256 expectedInr =
            requiredAmountInr(
                robotId,
                durationMinutes
            );

        require(
            amountInr == expectedInr,
            "Incorrect package amount"
        );

        uint256 expectedPayment =
            requiredPayment(
                robotId,
                durationMinutes
            );

        require(
            msg.value == expectedPayment,
            "Incorrect payment amount"
        );

        rentals[orderId] = Rental({
            orderId: orderId,
            robotId: robotId,
            service: service,
            durationMinutes: durationMinutes,
            amountInr: amountInr,
            amountPaidWei: msg.value,
            customer: msg.sender,
            startTime: block.timestamp,
            active: true
        });

        // Forward customer payment to Admin immediately.
        (bool sent, ) =
            paymentRecipient.call{
                value: msg.value
            }("");

        require(
            sent,
            "Payment transfer failed"
        );

        emit RentalCreated(
            orderId,
            robotId,
            service,
            durationMinutes,
            amountInr,
            msg.value,
            msg.sender,
            block.timestamp
        );
    }

    // =====================================================
    // READ RENTAL
    // =====================================================

    function getRental(
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
            uint256,
            address,
            uint256,
            bool
        )
    {
        Rental memory rental =
            rentals[orderId];

        return (
            rental.orderId,
            rental.robotId,
            rental.service,
            rental.durationMinutes,
            rental.amountInr,
            rental.amountPaidWei,
            rental.customer,
            rental.startTime,
            rental.active
        );
    }

    // =====================================================
    // END RENTAL
    // =====================================================

    function endRental(
        string calldata orderId
    ) external onlyOwner {

        require(
            rentals[orderId].customer != address(0),
            "Rental not found"
        );

        require(
            rentals[orderId].active,
            "Rental already ended"
        );

        rentals[orderId].active = false;

        emit RentalEnded(
            orderId,
            block.timestamp
        );
    }

    // =====================================================
    // CONTRACT BALANCE
    // =====================================================

    function contractBalance()
        external
        view
        returns (uint256)
    {
        return address(this).balance;
    }

    // =====================================================
    // SAFETY WITHDRAWAL
    // =====================================================

    function withdraw()
        external
        onlyOwner
    {
        uint256 balance =
            address(this).balance;

        require(
            balance > 0,
            "No balance"
        );

        (bool sent, ) =
            paymentRecipient.call{
                value: balance
            }("");

        require(
            sent,
            "Withdrawal failed"
        );
    }

    // Accept ETH sent directly to contract.
    receive() external payable {}
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RoboPay
 * @notice Autonomous Robotic Fleet Micro-Rental Protocol with On-Chain Escrow & Auto-Refund.
 */
contract RoboPay {

    enum RentalState {
        Active,
        Completed,
        Refunded
    }

    struct Rental {
        string orderId;
        string robotId;
        string service;
        uint256 durationMinutes;
        uint256 amountInr;
        uint256 amountPaidWei;
        uint256 escrowBalance;
        address customer;
        uint256 startTime;
        bool active;
        bool refunded;
        bool completed;
    }

    address public owner;
    address payable public immutable paymentRecipient;

    mapping(string => Rental) private rentals;
    mapping(address => string[]) private customerOrders;

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

    event RentalRefunded(
        string indexed orderId,
        address indexed customer,
        uint256 amountRefunded,
        uint256 timestamp
    );

    event EscrowReleased(
        string indexed orderId,
        address indexed recipient,
        uint256 amountReleased,
        uint256 timestamp
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

        bytes32 robotHash = keccak256(bytes(robotId));

        // RoboFollow (RF-01)
        if (robotHash == keccak256(bytes("RF-01"))) {
            if (durationMinutes == 10) return 20;
            if (durationMinutes == 20) return 40;
            if (durationMinutes == 30) return 60;
        }

        // RoboClean (FC-01)
        if (robotHash == keccak256(bytes("FC-01"))) {
            if (durationMinutes == 10) return 20;
            if (durationMinutes == 20) return 40;
            if (durationMinutes == 30) return 60;
        }

        // RoboTrolley (ST-01)
        if (robotHash == keccak256(bytes("ST-01"))) {
            if (durationMinutes == 10) return 10;
            if (durationMinutes == 20) return 20;
            if (durationMinutes == 30) return 30;
        }

        revert("Invalid robot or package");
    }

    // =====================================================
    // BASE SEPOLIA ETH PACKAGE PRICE
    // =====================================================

    function requiredPayment(
        string calldata robotId,
        uint256 durationMinutes
    ) public pure returns (uint256) {

        bytes32 robotHash = keccak256(bytes(robotId));

        // RoboFollow (RF-01)
        if (robotHash == keccak256(bytes("RF-01"))) {
            if (durationMinutes == 10) return 10000000000000; // 0.00001 ETH
            if (durationMinutes == 20) return 20000000000000; // 0.00002 ETH
            if (durationMinutes == 30) return 30000000000000; // 0.00003 ETH
        }

        // RoboClean (FC-01)
        if (robotHash == keccak256(bytes("FC-01"))) {
            if (durationMinutes == 10) return 10000000000000; // 0.00001 ETH
            if (durationMinutes == 20) return 20000000000000; // 0.00002 ETH
            if (durationMinutes == 30) return 30000000000000; // 0.00003 ETH
        }

        // RoboTrolley (ST-01)
        if (robotHash == keccak256(bytes("ST-01"))) {
            if (durationMinutes == 10) return 5000000000000;  // 0.000005 ETH
            if (durationMinutes == 20) return 10000000000000; // 0.000010 ETH
            if (durationMinutes == 30) return 15000000000000; // 0.000015 ETH
        }

        revert("Invalid robot or package");
    }

    // =====================================================
    // CUSTOMER RENTAL PAYMENT (HELD IN ON-CHAIN ESCROW)
    // =====================================================

    function rentRobot(
        string calldata orderId,
        string calldata robotId,
        string calldata service,
        uint256 durationMinutes,
        uint256 amountInr
    ) external payable {

        require(bytes(orderId).length > 0, "Invalid order ID");
        require(bytes(robotId).length > 0, "Invalid robot ID");
        require(rentals[orderId].customer == address(0), "Order already exists");

        uint256 expectedInr = requiredAmountInr(robotId, durationMinutes);
        require(amountInr == expectedInr, "Incorrect package amount");

        uint256 expectedPayment = requiredPayment(robotId, durationMinutes);
        require(msg.value == expectedPayment, "Incorrect payment amount");

        rentals[orderId] = Rental({
            orderId: orderId,
            robotId: robotId,
            service: service,
            durationMinutes: durationMinutes,
            amountInr: amountInr,
            amountPaidWei: msg.value,
            escrowBalance: msg.value,
            customer: msg.sender,
            startTime: block.timestamp,
            active: true,
            refunded: false,
            completed: false
        });

        customerOrders[msg.sender].push(orderId);

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
    // ON-CHAIN REFUND (CANCELLATION OR HARDWARE FAULT)
    // =====================================================

    function refundRental(
        string calldata orderId
    ) external {
        Rental storage rental = rentals[orderId];

        require(rental.customer != address(0), "Rental not found");
        require(rental.active, "Rental is not active");
        require(!rental.refunded, "Already refunded");
        require(!rental.completed, "Already completed");
        require(rental.escrowBalance > 0, "No escrow funds");

        // Allowed if called by customer or contract owner (admin/iot automated manager)
        require(
            msg.sender == rental.customer || msg.sender == owner,
            "Unauthorized to refund"
        );

        uint256 refundAmount = rental.escrowBalance;
        rental.escrowBalance = 0;
        rental.active = false;
        rental.refunded = true;

        (bool sent, ) = payable(rental.customer).call{value: refundAmount}("");
        require(sent, "Refund transfer failed");

        emit RentalRefunded(
            orderId,
            rental.customer,
            refundAmount,
            block.timestamp
        );
    }

    // =====================================================
    // SETTLE & RELEASE ESCROW UPON SERVICE COMPLETION
    // =====================================================

    function completeRentalAndRelease(
        string calldata orderId
    ) external {
        Rental storage rental = rentals[orderId];

        require(rental.customer != address(0), "Rental not found");
        require(rental.active, "Rental is not active");
        require(!rental.refunded, "Already refunded");
        require(!rental.completed, "Already completed");
        require(rental.escrowBalance > 0, "No escrow funds");

        // Can be completed by contract owner, or customer, or anyone after duration has passed
        bool durationPassed = block.timestamp >= (rental.startTime + (rental.durationMinutes * 60));
        require(
            msg.sender == owner || msg.sender == rental.customer || durationPassed,
            "Service duration not elapsed yet"
        );

        uint256 releaseAmount = rental.escrowBalance;
        rental.escrowBalance = 0;
        rental.active = false;
        rental.completed = true;

        (bool sent, ) = paymentRecipient.call{value: releaseAmount}("");
        require(sent, "Escrow release failed");

        emit RentalEnded(orderId, block.timestamp);
        emit EscrowReleased(orderId, paymentRecipient, releaseAmount, block.timestamp);
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
            bool,
            bool,
            bool
        )
    {
        Rental memory rental = rentals[orderId];

        return (
            rental.orderId,
            rental.robotId,
            rental.service,
            rental.durationMinutes,
            rental.amountInr,
            rental.amountPaidWei,
            rental.customer,
            rental.startTime,
            rental.active,
            rental.refunded,
            rental.completed
        );
    }

    // =====================================================
    // CUSTOMER ORDERS QUERY
    // =====================================================

    function getCustomerOrders(
        address customer
    ) external view returns (string[] memory) {
        return customerOrders[customer];
    }

    // =====================================================
    // LEGACY END RENTAL
    // =====================================================

    function endRental(
        string calldata orderId
    ) external onlyOwner {
        Rental storage rental = rentals[orderId];
        require(rental.customer != address(0), "Rental not found");
        require(rental.active, "Rental already ended");

        rental.active = false;
        rental.completed = true;

        if (rental.escrowBalance > 0) {
            uint256 releaseAmount = rental.escrowBalance;
            rental.escrowBalance = 0;
            (bool sent, ) = paymentRecipient.call{value: releaseAmount}("");
            require(sent, "Escrow payout failed");
            emit EscrowReleased(orderId, paymentRecipient, releaseAmount, block.timestamp);
        }

        emit RentalEnded(orderId, block.timestamp);
    }

    // =====================================================
    // CONTRACT BALANCE
    // =====================================================

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // =====================================================
    // SAFETY WITHDRAWAL
    // =====================================================

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");

        (bool sent, ) = paymentRecipient.call{value: balance}("");
        require(sent, "Withdrawal failed");
    }

    receive() external payable {}
}
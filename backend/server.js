const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

// ======================================================
// BASE SEPOLIA BLOCKCHAIN CONFIGURATION
// ======================================================

const RPC_URL =
    process.env.BASE_SEPOLIA_RPC_URL ||
    process.env.RPC_URL ||
    "https://sepolia.base.org";

const CONTRACT_ADDRESS =
    process.env.CONTRACT_ADDRESS ||
    "0xded19cE7998fB86A76C7f48Df66a2A3c2425A028";

const BASE_SEPOLIA_CHAIN_ID = 84532;

// ======================================================
// ROBO PAY SMART CONTRACT ABI
// ======================================================

const ROBO_PAY_ABI = [
    {
        inputs: [],
        name: "owner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },

    {
        inputs: [
            {
                internalType: "string",
                name: "robotId",
                type: "string",
            },
            {
                internalType: "uint256",
                name: "durationMinutes",
                type: "uint256",
            },
        ],
        name: "requiredPayment",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },

    {
        inputs: [
            {
                internalType: "string",
                name: "orderId",
                type: "string",
            },
        ],
        name: "getRental",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
            {
                internalType: "string",
                name: "",
                type: "string",
            },
            {
                internalType: "string",
                name: "",
                type: "string",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },

    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "string",
                name: "orderId",
                type: "string",
            },
            {
                indexed: false,
                internalType: "string",
                name: "robotId",
                type: "string",
            },
            {
                indexed: false,
                internalType: "string",
                name: "service",
                type: "string",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "durationMinutes",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amountInr",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amountPaidWei",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "address",
                name: "customer",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "startTime",
                type: "uint256",
            },
        ],
        name: "RentalCreated",
        type: "event",
    },

    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "string",
                name: "orderId",
                type: "string",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "endTime",
                type: "uint256",
            },
        ],
        name: "RentalEnded",
        type: "event",
    },
];

// ======================================================
// BLOCKCHAIN CONNECTION
// ======================================================

const provider = new ethers.JsonRpcProvider(RPC_URL);

const roboPayContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    ROBO_PAY_ABI,
    provider
);

// ======================================================
// EXPRESS SETUP
// ======================================================

app.use(
    cors({
        origin: true,
    })
);

app.use(express.json());

// ======================================================
// ROBOT DATA
// ======================================================

const robots = [
    {
        id: "RF-01",
        name: "RoboFollow",
        service: "Human Following",
        pricePer10Min: 20,
        status: "AVAILABLE",
    },

    {
        id: "FC-01",
        name: "RoboClean",
        service: "Floor Cleaning",
        pricePer10Min: 20,
        status: "IN USE",
    },

    {
        id: "ST-01",
        name: "RoboTrolley",
        service: "Smart Shopping Trolley",
        pricePer30Min: 30,
        status: "AVAILABLE",
    },
];

// ======================================================
// TEMPORARY ORDER STORAGE
// ======================================================

const orders = {};

// ======================================================
// HELPER: CALCULATE INR PRICE
// ======================================================

function calculateAmount(robot, durationMinutes) {

    if (robot.id === "ST-01") {
        return 30;
    }

    return (durationMinutes / 10) * 20;
}

// ======================================================
// HELPER: STOP RENTAL AFTER TIMER
// ======================================================

function scheduleRentalExpiry(orderId) {

    const order = orders[orderId];

    if (!order) {
        return;
    }

    const remainingTime =
        order.expiresAt - Date.now();

    if (remainingTime <= 0) {

        finishRental(orderId);

        return;
    }

    setTimeout(() => {

        finishRental(orderId);

    }, remainingTime);
}

// ======================================================
// HELPER: FINISH RENTAL
// ======================================================

function finishRental(orderId) {

    const order = orders[orderId];

    if (!order) {
        return;
    }

    if (order.rentalStatus !== "ACTIVE") {
        return;
    }

    order.rentalStatus = "EXPIRED";

    order.blockchainStatus = "CONFIRMED";

    order.robotStatus = "AVAILABLE";

    const robot = robots.find(
        (item) => item.id === order.robotId
    );

    if (robot) {
        robot.status = "AVAILABLE";
    }

    console.log(
        `Rental expired: ${orderId}`
    );
}

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/", (req, res) => {

    res.json({
        message: "RoboPay Backend is running!",
        status: "OK",
        blockchain: "Base Sepolia",
        contract: CONTRACT_ADDRESS,
    });
});

// ======================================================
// GET ALL ROBOTS
// ======================================================

app.get("/api/robots", (req, res) => {

    res.json(robots);

});

// ======================================================
// GET ONE ROBOT
// ======================================================

app.get("/api/robots/:id", (req, res) => {

    const robot = robots.find(
        (r) => r.id === req.params.id
    );

    if (!robot) {

        return res.status(404).json({
            success: false,
            error: "Robot not found",
        });

    }

    res.json(robot);

});

// ======================================================
// CREATE BOOKING
// ======================================================

app.post("/api/bookings", (req, res) => {

    const {
        robotId,
        durationMinutes,
    } = req.body;

    if (!robotId || !durationMinutes) {

        return res.status(400).json({
            success: false,
            error:
                "robotId and durationMinutes are required",
        });

    }

    const robot = robots.find(
        (r) => r.id === robotId
    );

    if (!robot) {

        return res.status(404).json({
            success: false,
            error: "Robot not found",
        });

    }

    if (robot.status !== "AVAILABLE") {

        return res.status(400).json({
            success: false,
            error:
                "Robot is currently unavailable",
        });

    }

    const duration = Number(durationMinutes);

    // RoboTrolley only allows 30 minutes
    if (
        robot.id === "ST-01" &&
        duration !== 30
    ) {

        return res.status(400).json({
            success: false,
            error:
                "RoboTrolley supports only 30 minutes",
        });

    }

    // Other robots support 10 / 20 / 30
    if (
        robot.id !== "ST-01" &&
        ![10, 20, 30].includes(duration)
    ) {

        return res.status(400).json({
            success: false,
            error:
                "Duration must be 10, 20 or 30 minutes",
        });

    }

    const amountInr =
        calculateAmount(
            robot,
            duration
        );

    const orderId =
        "RP" + Date.now();

    orders[orderId] = {

        orderId,

        robotId:
            robot.id,

        robotName:
            robot.name,

        service:
            robot.service,

        durationMinutes:
            duration,

        amountInr,

        paymentStatus:
            "PENDING",

        blockchainStatus:
            "WAITING",

        rentalStatus:
            "PENDING",

        transactionHash:
            null,

        walletAddress:
            null,

        startedAt:
            null,

        expiresAt:
            null,

        robotStatus:
            "AVAILABLE",

    };

    res.json({

        success: true,

        message:
            "Booking created",

        order:
            orders[orderId],

    });

});

// ======================================================
// GET ORDER
// ======================================================

app.get(
    "/api/orders/:orderId",
    (req, res) => {

        const order =
            orders[
                req.params.orderId
            ];

        if (!order) {

            return res.status(404).json({

                success: false,

                error:
                    "Order not found",

            });

        }

        res.json({

            success: true,

            order,

        });

    }
);

// ======================================================
// VERIFY CUSTOMER BLOCKCHAIN PAYMENT
// ======================================================
//
// This is the new REAL verification route.
//
// Frontend sends:
//   orderId
//   transactionHash
//   walletAddress
//
// Backend independently checks Base Sepolia:
//   1. correct network
//   2. transaction exists
//   3. transaction succeeded
//   4. transaction went to our contract
//   5. transaction came from claimed wallet
//   6. RentalCreated event exists
//   7. event matches robot/package/customer
//   8. amount paid matches contract-required amount
//
// Only then does the backend mark the rental ACTIVE.
// ======================================================

app.post(
    "/api/blockchain/verify-rental",
    async (req, res) => {

        try {

            const {
                orderId,
                transactionHash,
                walletAddress,
            } = req.body;

            // ----------------------------------------------
            // Basic validation
            // ----------------------------------------------

            if (
                !orderId ||
                !transactionHash ||
                !walletAddress
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "orderId, transactionHash and walletAddress are required",

                });

            }

            // ----------------------------------------------
            // Check order
            // ----------------------------------------------

            const order =
                orders[orderId];

            if (!order) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Order not found",

                });

            }

            // ----------------------------------------------
            // Prevent double verification
            // ----------------------------------------------

            if (
                order.paymentStatus === "CONFIRMED" &&
                order.rentalStatus === "ACTIVE"
            ) {

                return res.json({

                    success: true,

                    message:
                        "Rental already verified",

                    order,

                });

            }

            // ----------------------------------------------
            // Validate wallet address
            // ----------------------------------------------

            let normalizedWallet;

            try {

                normalizedWallet =
                    ethers.getAddress(
                        walletAddress
                    );

            } catch {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid wallet address",

                });

            }

            // ----------------------------------------------
            // Check blockchain network
            // ----------------------------------------------

            const network =
                await provider.getNetwork();

            const chainId =
                Number(
                    network.chainId
                );

            if (
                chainId !==
                BASE_SEPOLIA_CHAIN_ID
            ) {

                return res.status(500).json({

                    success: false,

                    error:
                        "Backend is connected to the wrong blockchain network",

                    chainId,

                });

            }

            // ----------------------------------------------
            // Get transaction
            // ----------------------------------------------

            const transaction =
                await provider.getTransaction(
                    transactionHash
                );

            if (!transaction) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Blockchain transaction not found",

                });

            }

            // ----------------------------------------------
            // Check transaction destination
            // ----------------------------------------------

            if (
                !transaction.to ||
                transaction.to.toLowerCase() !==
                    CONTRACT_ADDRESS.toLowerCase()
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Transaction was not sent to the RoboPay contract",

                });

            }

            // ----------------------------------------------
            // Check transaction sender
            // ----------------------------------------------

            if (
                transaction.from.toLowerCase() !==
                    normalizedWallet.toLowerCase()
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Transaction sender does not match customer wallet",

                });

            }

            // ----------------------------------------------
            // Get receipt
            // ----------------------------------------------

            const receipt =
                await provider.getTransactionReceipt(
                    transactionHash
                );

            if (!receipt) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Transaction is not confirmed yet",

                });

            }

            // ----------------------------------------------
            // Check transaction status
            // ----------------------------------------------

            if (
                receipt.status !== 1
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Blockchain transaction failed",

                });

            }

            // ----------------------------------------------
            // Find RentalCreated event
            // ----------------------------------------------

            const contractInterface =
                new ethers.Interface(
                    ROBO_PAY_ABI
                );

            let rentalEvent = null;

            for (
                const log of receipt.logs
            ) {

                if (
                    log.address.toLowerCase() !==
                    CONTRACT_ADDRESS.toLowerCase()
                ) {
                    continue;
                }

                try {

                    const parsed =
                        contractInterface.parseLog({
                            topics:
                                log.topics,
                            data:
                                log.data,
                        });

                    if (
                        parsed &&
                        parsed.name ===
                            "RentalCreated"
                    ) {

                        rentalEvent =
                            parsed;

                        break;
                    }

                } catch {

                    // Ignore unrelated logs
                }
            }

            if (!rentalEvent) {

                return res.status(400).json({

                    success: false,

                    error:
                        "RentalCreated event not found in transaction",

                });

            }

            // ----------------------------------------------
            // Verify event values
            // ----------------------------------------------

            const args =
                rentalEvent.args;

            // For an indexed string, Solidity stores the hash
            // in the event topic.
            const orderIdHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        orderId
                    )
                );

            const indexedOrderId =
                args.orderId;

            let eventOrderHash = null;

            if (
                indexedOrderId &&
                typeof indexedOrderId ===
                    "object" &&
                indexedOrderId.hash
            ) {

                eventOrderHash =
                    indexedOrderId.hash;

            }

            if (
                !eventOrderHash ||
                eventOrderHash.toLowerCase() !==
                    orderIdHash.toLowerCase()
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Transaction does not belong to this order",

                });

            }

            // ----------------------------------------------
            // Event robot verification
            // ----------------------------------------------

            if (
                args.robotId !==
                order.robotId
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Robot ID does not match booking",

                });

            }

            // ----------------------------------------------
            // Event service verification
            // ----------------------------------------------

            if (
                args.service !==
                order.service
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Service does not match booking",

                });

            }

            // ----------------------------------------------
            // Event duration verification
            // ----------------------------------------------

            if (
                Number(
                    args.durationMinutes
                ) !==
                    order.durationMinutes
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Duration does not match booking",

                });

            }

            // ----------------------------------------------
            // Event INR amount verification
            // ----------------------------------------------

            if (
                Number(
                    args.amountInr
                ) !==
                    order.amountInr
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Package amount does not match booking",

                });

            }

            // ----------------------------------------------
            // Customer verification
            // ----------------------------------------------

            if (
                args.customer.toLowerCase() !==
                    normalizedWallet.toLowerCase()
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Customer wallet does not match blockchain rental",

                });

            }

            // ----------------------------------------------
            // Actual ETH payment verification
            // ----------------------------------------------

            const requiredAmount =
                await roboPayContract.requiredPayment(
                    order.robotId,
                    order.durationMinutes
                );

            if (
                transaction.value !==
                requiredAmount
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Transaction payment amount does not match required package amount",

                    expected:
                        requiredAmount.toString(),

                    received:
                        transaction.value.toString(),

                });

            }

            if (
                args.amountPaidWei !==
                requiredAmount
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Blockchain rental payment amount is invalid",

                });

            }

            // ----------------------------------------------
            // ALL CHECKS PASSED
            // ----------------------------------------------

            const startTime =
                Number(
                    args.startTime
                );

            const expiresAt =
                startTime +
                order.durationMinutes *
                    60;

            order.paymentStatus =
                "CONFIRMED";

            order.blockchainStatus =
                "CONFIRMED";

            order.rentalStatus =
                "ACTIVE";

            order.transactionHash =
                transactionHash;

            order.walletAddress =
                normalizedWallet;

            order.startedAt =
                startTime * 1000;

            order.expiresAt =
                expiresAt * 1000;

            order.robotStatus =
                "IN USE";

            const robot =
                robots.find(
                    (item) =>
                        item.id ===
                        order.robotId
                );

            if (robot) {
                robot.status =
                    "IN USE";
            }

            scheduleRentalExpiry(
                orderId
            );

            console.log(
                "========================================"
            );

            console.log(
                "BLOCKCHAIN RENTAL VERIFIED"
            );

            console.log(
                "Order:",
                order.orderId
            );

            console.log(
                "Robot:",
                order.robotId
            );

            console.log(
                "Customer:",
                normalizedWallet
            );

            console.log(
                "Transaction:",
                transactionHash
            );

            console.log(
                "Status: ACTIVE"
            );

            console.log(
                "========================================"
            );

            res.json({

                success: true,

                message:
                    "Blockchain payment verified successfully",

                order,

                verification: {

                    network:
                        "Base Sepolia",

                    chainId:
                        BASE_SEPOLIA_CHAIN_ID,

                    contract:
                        CONTRACT_ADDRESS,

                    transactionHash,

                    customer:
                        normalizedWallet,

                    paymentWei:
                        transaction.value.toString(),

                    rentalStatus:
                        order.rentalStatus,

                    expiresAt:
                        order.expiresAt,

                },

            });

        } catch (error) {

            console.error(
                "Blockchain verification error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to verify blockchain payment",

                details:
                    error.message,

            });

        }
    }
);

// ======================================================
// BLOCKCHAIN RENTAL READ
// ======================================================

app.get(
    "/api/blockchain/rental/:orderId",
    async (req, res) => {

        try {

            const rental =
                await roboPayContract.getRental(
                    req.params.orderId
                );

            res.json({

                success: true,

                blockchainRental: {

                    orderId:
                        rental[0],

                    robotId:
                        rental[1],

                    service:
                        rental[2],

                    durationMinutes:
                        rental[3].toString(),

                    amountInr:
                        rental[4].toString(),

                    amountPaidWei:
                        rental[5].toString(),

                    customer:
                        rental[6],

                    startTime:
                        rental[7].toString(),

                    active:
                        rental[8],

                },

            });

        } catch (error) {

            console.error(
                "Blockchain rental read error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to read blockchain rental",

                details:
                    error.message,

            });

        }

    }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    async () => {

        console.log(
            "----------------------------------------"
        );

        console.log(
            "RoboPay Backend"
        );

        console.log(
            "----------------------------------------"
        );

        console.log(
            `Server running on http://localhost:${PORT}`
        );

        console.log(
            "Blockchain Network: Base Sepolia"
        );

        console.log(
            "Contract:",
            CONTRACT_ADDRESS
        );

        console.log(
            "Blockchain verification API:"
        );

        console.log(
            "/api/blockchain/verify-rental"
        );

        console.log(
            "----------------------------------------"
        );

        // Check blockchain connection
        try {

            const network =
                await provider.getNetwork();

            console.log(
                "Connected chain ID:",
                network.chainId.toString()
            );

        } catch (error) {

            console.error(
                "Blockchain connection failed:",
                error.message
            );

        }

    }
);
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const {
    recordPayment,
    getPayment
} = require("./blockchain");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/*
|--------------------------------------------------------------------------
| Demo Robot Data
|--------------------------------------------------------------------------
*/

const robots = [
    {
        id: "RF-01",
        name: "RoboFollow",
        service: "Human Following",
        pricePer10Min: 20,
        status: "AVAILABLE"
    },
    {
        id: "FC-01",
        name: "RoboClean",
        service: "Floor Cleaning",
        pricePer10Min: 20,
        status: "IN USE"
    },
    {
        id: "ST-01",
        name: "RoboTrolley",
        service: "Smart Shopping Trolley",
        pricePer30Min: 30,
        status: "AVAILABLE"
    }
];

/*
|--------------------------------------------------------------------------
| Temporary Demo Orders
|--------------------------------------------------------------------------
*/

const orders = {};

/*
|--------------------------------------------------------------------------
| Helper: Calculate Price
|--------------------------------------------------------------------------
*/

function calculateAmount(robot, durationMinutes) {

    if (robot.id === "ST-01") {
        return 30;
    }

    return (durationMinutes / 10) * 20;
}

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {

    res.json({
        message: "RoboPay Backend is running!",
        status: "OK"
    });

});

/*
|--------------------------------------------------------------------------
| Get All Robots
|--------------------------------------------------------------------------
*/

app.get("/api/robots", (req, res) => {

    res.json(robots);

});

/*
|--------------------------------------------------------------------------
| Get One Robot
|--------------------------------------------------------------------------
*/

app.get("/api/robots/:id", (req, res) => {

    const robot = robots.find(
        r => r.id === req.params.id
    );

    if (!robot) {

        return res.status(404).json({
            success: false,
            error: "Robot not found"
        });

    }

    res.json(robot);

});

/*
|--------------------------------------------------------------------------
| Create Booking
|--------------------------------------------------------------------------
*/

app.post("/api/bookings", (req, res) => {

    const {
        robotId,
        durationMinutes
    } = req.body;

    if (!robotId || !durationMinutes) {

        return res.status(400).json({
            success: false,
            error: "robotId and durationMinutes are required"
        });

    }

    const robot = robots.find(
        r => r.id === robotId
    );

    if (!robot) {

        return res.status(404).json({
            success: false,
            error: "Robot not found"
        });

    }

    if (robot.status !== "AVAILABLE") {

        return res.status(400).json({
            success: false,
            error: "Robot is currently unavailable"
        });

    }

    if (![10, 20, 30].includes(Number(durationMinutes))) {

        return res.status(400).json({
            success: false,
            error: "Duration must be 10, 20 or 30 minutes"
        });

    }

    const amountInr = calculateAmount(
        robot,
        Number(durationMinutes)
    );

    const orderId =
        "RP" + Date.now();

    orders[orderId] = {

        orderId,

        robotId: robot.id,

        robotName: robot.name,

        service: robot.service,

        durationMinutes: Number(durationMinutes),

        amountInr,

        paymentStatus: "PENDING",

        blockchainStatus: "WAITING",

        transactionHash: null

    };

    res.json({

        success: true,

        message: "Booking created",

        order: orders[orderId]

    });

});

/*
|--------------------------------------------------------------------------
| Get Order
|--------------------------------------------------------------------------
*/

app.get("/api/orders/:orderId", (req, res) => {

    const order =
        orders[req.params.orderId];

    if (!order) {

        return res.status(404).json({

            success: false,

            error: "Order not found"

        });

    }

    res.json({

        success: true,

        order

    });

});

/*
|--------------------------------------------------------------------------
| Record Verified Payment on Blockchain
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This endpoint is intentionally protected by requiring:
|
| paymentStatus = VERIFIED
|
| Later, your real UPI/payment-provider webhook will be responsible
| for establishing that the payment is actually verified.
|
*/

app.post(
    "/api/blockchain/record-payment",
    async (req, res) => {

        try {

            const {
                orderId,
                paymentStatus,
                paymentReference
            } = req.body;

            if (!orderId) {

                return res.status(400).json({

                    success: false,

                    error: "orderId is required"

                });

            }

            if (paymentStatus !== "VERIFIED") {

                return res.status(400).json({

                    success: false,

                    error:
                        "Payment must be VERIFIED before blockchain recording"

                });

            }

            if (!paymentReference) {

                return res.status(400).json({

                    success: false,

                    error:
                        "paymentReference is required"

                });

            }

            const order = orders[orderId];

            if (!order) {

                return res.status(404).json({

                    success: false,

                    error: "Order not found"

                });

            }

            if (
                order.paymentStatus === "VERIFIED" &&
                order.blockchainStatus === "CONFIRMED"
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Payment has already been recorded on blockchain",

                    transactionHash:
                        order.transactionHash

                });

            }

            /*
             * Generate a deterministic hash from the payment reference.
             *
             * Example:
             * UPI reference -> blockchain paymentHash
             */

            const {
                ethers
            } = require("ethers");

            const paymentHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        paymentReference
                    )
                );

            console.log(
                "Recording payment on blockchain..."
            );

            const receipt =
                await recordPayment({

                    orderId:
                        order.orderId,

                    robotId:
                        order.robotId,

                    service:
                        order.service,

                    durationMinutes:
                        order.durationMinutes,

                    amountInr:
                        order.amountInr,

                    paymentHash

                });

            order.paymentStatus =
                "VERIFIED";

            order.blockchainStatus =
                "CONFIRMED";

            order.transactionHash =
                receipt.hash;

            res.json({

                success: true,

                message:
                    "Payment verified and recorded on blockchain",

                orderId:
                    order.orderId,

                amountInr:
                    order.amountInr,

                blockchainStatus:
                    order.blockchainStatus,

                transactionHash:
                    receipt.hash

            });

        } catch (error) {

            console.error(
                "Blockchain payment error:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Failed to record payment on blockchain",

                details:
                    error.message

            });

        }

    }
);

/*
|--------------------------------------------------------------------------
| Read Payment From Blockchain
|--------------------------------------------------------------------------
*/

app.get(
    "/api/blockchain/payment/:orderId",
    async (req, res) => {

        try {

            const payment =
                await getPayment(
                    req.params.orderId
                );

            res.json({

                success: true,

                blockchainPayment: {

                    orderId: payment[0],

                    robotId: payment[1],

                    service: payment[2],

                    durationMinutes:
                        payment[3].toString(),

                    amountInr:
                        payment[4].toString(),

                    paymentHash:
                        payment[5],

                    timestamp:
                        payment[6].toString(),

                    verified:
                        payment[7]

                }

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                error:
                    "Failed to read blockchain payment"

            });

        }

    }
);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {

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
        "Blockchain API: /api/blockchain/record-payment"
    );

    console.log(
        "----------------------------------------"
    );

});
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const RPC_URL = process.env.RPC_URL;

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!RPC_URL) {
    throw new Error("RPC_URL is missing in .env");
}

if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS is missing in .env");
}

if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is missing in .env");
}

const artifactPath = path.join(
    __dirname,
    "..",
    "blockchain",
    "artifacts",
    "contracts",
    "RoboPay.sol",
    "RoboPay.json"
);

if (!fs.existsSync(artifactPath)) {
    throw new Error(
        `RoboPay artifact not found at: ${artifactPath}`
    );
}

const artifact = JSON.parse(
    fs.readFileSync(artifactPath, "utf8")
);

const provider = new ethers.JsonRpcProvider(RPC_URL);

const wallet = new ethers.Wallet(
    PRIVATE_KEY,
    provider
);

const roboPay = new ethers.Contract(
    CONTRACT_ADDRESS,
    artifact.abi,
    wallet
);

async function recordPayment({
    orderId,
    robotId,
    service,
    durationMinutes,
    amountInr,
    paymentHash
}) {
    const transaction = await roboPay.recordPayment(
        orderId,
        robotId,
        service,
        durationMinutes,
        amountInr,
        paymentHash
    );

    console.log(
        "Blockchain transaction sent:",
        transaction.hash
    );

    const receipt = await transaction.wait();

    console.log(
        "Blockchain transaction confirmed:",
        receipt.hash
    );

    return receipt;
}

async function getPayment(orderId) {
    return await roboPay.getPayment(orderId);
}

module.exports = {
    provider,
    roboPay,
    recordPayment,
    getPayment
};
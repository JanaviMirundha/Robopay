const { recordPayment } = require("./blockchain");
const { ethers } = require("ethers");

async function main() {
    console.log("Starting RoboPay blockchain test...");
    console.log("----------------------------------------");

    const paymentHash = ethers.keccak256(
        ethers.toUtf8Bytes("UPI-DEMO-RP1001")
    );

    const receipt = await recordPayment({
        orderId: "RP1001",
        robotId: "RF-01",
        service: "Human Following",
        durationMinutes: 30,
        amountInr: 60,
        paymentHash: paymentHash
    });

    console.log("----------------------------------------");
    console.log("PAYMENT RECORDED ON BLOCKCHAIN ✅");
    console.log("Order ID: RP1001");
    console.log("Robot ID: RF-01");
    console.log("Amount: ₹60");
    console.log("Duration: 30 minutes");
    console.log("Transaction Hash:", receipt.hash);
    console.log("----------------------------------------");
}

main().catch((error) => {
    console.error("Blockchain test failed:");
    console.error(error);
    process.exitCode = 1;
});
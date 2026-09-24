import { ethers } from "ethers";
import { connectMetaMask } from "./wallet";
import {
    ROBO_PAY_CONTRACT,
    ROBO_PAY_ABI,
} from "./contract";

export async function payForRental({
    orderId,
    robotId,
    service,
    durationMinutes,
    amountInr,
}) {
    if (!orderId) {
        throw new Error("Order ID is missing.");
    }

    if (!robotId) {
        throw new Error("Robot ID is missing.");
    }

    if (!service) {
        throw new Error("Robot service is missing.");
    }

    if (!durationMinutes) {
        throw new Error("Rental duration is missing.");
    }

    if (amountInr === undefined || amountInr === null) {
        throw new Error("Package amount is missing.");
    }

    // Connect to MetaMask and make sure the user is on Base Sepolia.
    const { signer } = await connectMetaMask();

    if (!signer) {
        throw new Error("MetaMask signer could not be obtained.");
    }

    // Create the RoboPay smart contract instance.
    const contract = new ethers.Contract(
        ROBO_PAY_CONTRACT,
        ROBO_PAY_ABI,
        signer
    );

    // Ask the smart contract for the exact ETH amount
    // required for this robot and duration.
    const requiredPayment =
        await contract.requiredPayment(
            robotId,
            durationMinutes
        );

    // Ask the smart contract for the exact INR package amount.
    const requiredInr =
        await contract.requiredAmountInr(
            robotId,
            durationMinutes
        );

    const requiredInrNumber =
        Number(requiredInr);

    if (
        requiredInrNumber !==
        Number(amountInr)
    ) {
        throw new Error(
            `Package mismatch. RoboPay contract requires ₹${requiredInrNumber}, but this order is ₹${amountInr}.`
        );
    }

    console.log(
        "----------------------------------------"
    );

    console.log(
        "RoboPay contract:",
        ROBO_PAY_CONTRACT
    );

    console.log(
        "Order ID:",
        orderId
    );

    console.log(
        "Robot:",
        robotId
    );

    console.log(
        "Duration:",
        durationMinutes,
        "minutes"
    );

    console.log(
        "INR package:",
        `₹${amountInr}`
    );

    console.log(
        "Required ETH:",
        ethers.formatEther(
            requiredPayment
        )
    );

    console.log(
        "----------------------------------------"
    );

    // REAL blockchain transaction.
    // This calls the RoboPay smart contract's rentRobot()
    // function. It is NOT a normal wallet-to-wallet transfer.
    const transaction =
        await contract.rentRobot(
            orderId,
            robotId,
            service,
            durationMinutes,
            amountInr,
            {
                value: requiredPayment,
            }
        );

    console.log(
        "RoboPay transaction submitted:",
        transaction.hash
    );

    // Wait until the Base Sepolia transaction is confirmed.
    const receipt =
        await transaction.wait();

    if (!receipt) {
        throw new Error(
            "No transaction receipt was returned."
        );
    }

    if (
        receipt.status !== 1
    ) {
        throw new Error(
            "RoboPay blockchain transaction failed."
        );
    }

    console.log(
        "RoboPay transaction confirmed:"
    );

    console.log(
        "Transaction hash:",
        receipt.hash
    );

    console.log(
        "Block:",
        receipt.blockNumber
    );

    return {
        success: true,

        transactionHash:
            receipt.hash,

        blockNumber:
            receipt.blockNumber,

        amountPaidWei:
            requiredPayment.toString(),
    };
}

export async function refundRentalOnChain(orderId) {
    if (!orderId) {
        throw new Error("Order ID is missing.");
    }

    const { signer } = await connectMetaMask();
    if (!signer) {
        throw new Error("MetaMask signer could not be obtained.");
    }

    const contract = new ethers.Contract(
        ROBO_PAY_CONTRACT,
        ROBO_PAY_ABI,
        signer
    );

    const transaction = await contract.refundRental(orderId);
    console.log("RoboPay refund transaction submitted:", transaction.hash);

    const receipt = await transaction.wait();
    if (!receipt || receipt.status !== 1) {
        throw new Error("Refund transaction failed on blockchain.");
    }

    return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
    };
}

export async function completeRentalOnChain(orderId) {
    if (!orderId) {
        throw new Error("Order ID is missing.");
    }

    const { signer } = await connectMetaMask();
    if (!signer) {
        throw new Error("MetaMask signer could not be obtained.");
    }

    const contract = new ethers.Contract(
        ROBO_PAY_CONTRACT,
        ROBO_PAY_ABI,
        signer
    );

    const transaction = await contract.completeRentalAndRelease(orderId);
    const receipt = await transaction.wait();
    return {
        success: true,
        transactionHash: receipt.hash,
    };
}
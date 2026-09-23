import { network } from "hardhat";
import "dotenv/config";
import { getAddress } from "ethers";

async function main() {
    const { ethers } = await network.connect();

    console.log("Deploying RoboPay to Base Sepolia...");

    const paymentRecipient = process.env.PAYMENT_RECIPIENT;

    if (!paymentRecipient) {
        throw new Error(
            "PAYMENT_RECIPIENT is missing from blockchain/.env"
        );
    }

    const normalizedRecipient = getAddress(paymentRecipient);

    const signers = await ethers.getSigners();

    if (signers.length === 0) {
        throw new Error("No deployer account available.");
    }

    const deployer = signers[0];

    const deployerAddress = await deployer.getAddress();

    console.log("Deployer:", deployerAddress);
    console.log("Payment recipient:", normalizedRecipient);

    // Make sure Account 2 is being used.
    if (
        deployerAddress.toLowerCase() !==
        normalizedRecipient.toLowerCase()
    ) {
        throw new Error(
            "The deployer account must be the same as PAYMENT_RECIPIENT (Account 2)."
        );
    }

    // Check network.
    const networkInfo = await ethers.provider.getNetwork();

    console.log(
        "Chain ID:",
        networkInfo.chainId.toString()
    );

    if (networkInfo.chainId !== 84532n) {
        throw new Error(
            "Wrong network. Expected Base Sepolia (Chain ID 84532)."
        );
    }

    // Check Account 2 balance.
    const balance = await ethers.provider.getBalance(
        deployerAddress
    );

    console.log(
        "Deployer balance:",
        ethers.formatEther(balance),
        "ETH"
    );

    if (balance === 0n) {
        throw new Error(
            "Account 2 has no Base Sepolia ETH for deployment gas."
        );
    }

    // Get contract factory.
    const RoboPay =
        await ethers.getContractFactory("RoboPay");

    console.log("Sending deployment transaction...");

    // Deploy with Account 2 as payment recipient.
    const roboPay =
        await RoboPay.deploy(normalizedRecipient);

    const deploymentTx =
        roboPay.deploymentTransaction();

    if (!deploymentTx) {
        throw new Error(
            "Deployment transaction was not created."
        );
    }

    console.log(
        "Deployment transaction:",
        deploymentTx.hash
    );

    console.log("Waiting for confirmation...");

    const receipt = await deploymentTx.wait();

    if (!receipt) {
        throw new Error(
            "Deployment receipt was not returned."
        );
    }

    if (receipt.status !== 1) {
        throw new Error(
            "Deployment transaction failed."
        );
    }

    console.log(
        "Deployment confirmed in block:",
        receipt.blockNumber
    );

    // Get deployed contract address.
    const contractAddress =
        await roboPay.getAddress();

    console.log(
        "Contract Address:",
        contractAddress
    );

    // Give the public RPC a few seconds to expose the
    // newly deployed bytecode.
    let contractCode = "0x";

    for (let attempt = 1; attempt <= 10; attempt++) {
        contractCode =
            await ethers.provider.getCode(
                contractAddress
            );

        if (contractCode !== "0x") {
            break;
        }

        console.log(
            `Waiting for contract code to become available (${attempt}/10)...`
        );

        await new Promise(resolve =>
            setTimeout(resolve, 2000)
        );
    }

    console.log("----------------------------------------");
    console.log("RoboPay deployed successfully!");
    console.log("Contract Address:", contractAddress);
    console.log("Owner:", deployerAddress);
    console.log(
        "Payment Recipient:",
        normalizedRecipient
    );

    if (contractCode === "0x") {
        console.log(
            "Warning: the RPC has not returned contract bytecode yet."
        );
        console.log(
            "The deployment transaction itself was successful."
        );
    } else {
        console.log(
            "Contract bytecode detected successfully."
        );
    }

    console.log("----------------------------------------");
    console.log("Base Sepolia Explorer:");
    console.log(
        `https://sepolia.basescan.org/address/${contractAddress}`
    );
    console.log("----------------------------------------");
}

main().catch((error) => {
    console.error("");
    console.error("DEPLOYMENT FAILED");
    console.error(error);
    process.exitCode = 1;
});
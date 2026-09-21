import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect();

    console.log("Deploying RoboPay smart contract...");

    const RoboPay = await ethers.getContractFactory("RoboPay");

    const roboPay = await RoboPay.deploy();

    await roboPay.waitForDeployment();

    const contractAddress = await roboPay.getAddress();

    console.log("----------------------------------------");
    console.log("RoboPay deployed successfully!");
    console.log("Contract Address:", contractAddress);
    console.log("----------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
import { expect } from "chai";
import { network } from "hardhat";

describe("RoboPay", function () {
  it("should deploy the RoboPay contract", async function () {
    const { ethers } = await network.connect();

    const RoboPay = await ethers.getContractFactory("RoboPay");

    const roboPay = await RoboPay.deploy();

    await roboPay.waitForDeployment();

    const address = await roboPay.getAddress();

    expect(address).to.be.properAddress;
  });

  it("should record a verified robot payment", async function () {
    const { ethers } = await network.connect();

    const RoboPay = await ethers.getContractFactory("RoboPay");

    const roboPay = await RoboPay.deploy();

    await roboPay.waitForDeployment();

    const orderId = "RP1001";
    const robotId = "RF-01";
    const service = "Human Following";
    const duration = 30;
    const amount = 60;

    const paymentHash = ethers.keccak256(
      ethers.toUtf8Bytes("UPI-RP1001")
    );

    await roboPay.recordPayment(
      orderId,
      robotId,
      service,
      duration,
      amount,
      paymentHash
    );

    const payment = await roboPay.getPayment(orderId);

    expect(payment[0]).to.equal(orderId);
    expect(payment[1]).to.equal(robotId);
    expect(payment[2]).to.equal(service);
    expect(payment[3]).to.equal(duration);
    expect(payment[4]).to.equal(amount);
    expect(payment[5]).to.equal(paymentHash);
    expect(payment[7]).to.equal(true);
  });

  it("should prevent another wallet from recording a payment", async function () {
    const { ethers } = await network.connect();

    const [owner, otherUser] = await ethers.getSigners();

    const RoboPay = await ethers.getContractFactory("RoboPay");

    const roboPay = await RoboPay.deploy();

    await roboPay.waitForDeployment();

    const paymentHash = ethers.keccak256(
      ethers.toUtf8Bytes("UPI-RP1002")
    );

    await expect(
      roboPay
        .connect(otherUser)
        .recordPayment(
          "RP1002",
          "FC-01",
          "Floor Cleaning",
          10,
          20,
          paymentHash
        )
    ).to.be.revertedWith("Only owner can perform this action");
  });
});
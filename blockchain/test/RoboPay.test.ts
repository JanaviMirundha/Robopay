import { expect } from "chai";
import { network } from "hardhat";

describe("RoboPay", function () {

    async function deployContract() {
        const { ethers } = await network.connect();

        const [owner, customer, recipient, otherUser] =
            await ethers.getSigners();

        const RoboPay = await ethers.getContractFactory("RoboPay");

        const roboPay = await RoboPay.deploy(
            await recipient.getAddress()
        );

        await roboPay.waitForDeployment();

        return {
            ethers,
            roboPay,
            owner,
            customer,
            recipient,
            otherUser
        };
    }

    it("deploys with the correct owner and payment recipient", async function () {
        const {
            roboPay,
            owner,
            recipient
        } = await deployContract();

        expect(await roboPay.owner())
            .to.equal(await owner.getAddress());

        expect(await roboPay.paymentRecipient())
            .to.equal(await recipient.getAddress());
    });

    it("returns correct INR price for RF-01", async function () {
        const { roboPay } = await deployContract();

        expect(
            await roboPay.requiredAmountInr("RF-01", 10)
        ).to.equal(20);

        expect(
            await roboPay.requiredAmountInr("RF-01", 20)
        ).to.equal(40);

        expect(
            await roboPay.requiredAmountInr("RF-01", 30)
        ).to.equal(60);
    });

    it("returns correct ETH price for RF-01", async function () {
        const { roboPay, ethers } = await deployContract();

        expect(
            await roboPay.requiredPayment("RF-01", 10)
        ).to.equal(
            ethers.parseEther("0.00001")
        );

        expect(
            await roboPay.requiredPayment("RF-01", 20)
        ).to.equal(
            ethers.parseEther("0.00002")
        );

        expect(
            await roboPay.requiredPayment("RF-01", 30)
        ).to.equal(
            ethers.parseEther("0.00003")
        );
    });

    it("creates rental with correct payment and forwards payment", async function () {
        const {
            roboPay,
            customer,
            recipient,
            ethers
        } = await deployContract();

        const orderId = "ORDER-001";
        const robotId = "RF-01";
        const service = "Human Following Robot";
        const durationMinutes = 10;
        const amountInr = 20;

        const payment = await roboPay.requiredPayment(
            robotId,
            durationMinutes
        );

        const recipientBefore =
            await ethers.provider.getBalance(
                await recipient.getAddress()
            );

        await roboPay.connect(customer).rentRobot(
            orderId,
            robotId,
            service,
            durationMinutes,
            amountInr,
            {
                value: payment
            }
        );

        const recipientAfter =
            await ethers.provider.getBalance(
                await recipient.getAddress()
            );

        // Customer payment must reach the admin/payment recipient.
        expect(recipientAfter)
            .to.equal(recipientBefore + payment);

        // Payment must not remain inside the contract.
        expect(
            await roboPay.contractBalance()
        ).to.equal(0);
    });

    it("rejects incorrect ETH payment", async function () {
        const {
            roboPay,
            customer,
            ethers
        } = await deployContract();

        const correctPayment =
            await roboPay.requiredPayment("RF-01", 10);

        const wrongPayment =
            correctPayment +
            ethers.parseEther("0.00001");

        await expect(
            roboPay.connect(customer).rentRobot(
                "ORDER-002",
                "RF-01",
                "Human Following Robot",
                10,
                20,
                {
                    value: wrongPayment
                }
            )
        ).to.be.revert(ethers);
    });

    it("rejects incorrect INR package amount", async function () {
        const {
            roboPay,
            customer,
            ethers
        } = await deployContract();

        const payment =
            await roboPay.requiredPayment("RF-01", 10);

        await expect(
            roboPay.connect(customer).rentRobot(
                "ORDER-003",
                "RF-01",
                "Human Following Robot",
                10,
                40,
                {
                    value: payment
                }
            )
        ).to.be.revert(ethers);
    });

    it("rejects invalid robot or package", async function () {
        const {
            roboPay,
            ethers
        } = await deployContract();

        await expect(
            roboPay.requiredPayment(
                "INVALID",
                10
            )
        ).to.be.revert(ethers);
    });

    it("rejects duplicate orders", async function () {
        const {
            roboPay,
            customer,
            ethers
        } = await deployContract();

        const payment =
            await roboPay.requiredPayment("RF-01", 10);

        await roboPay.connect(customer).rentRobot(
            "ORDER-004",
            "RF-01",
            "Human Following Robot",
            10,
            20,
            {
                value: payment
            }
        );

        await expect(
            roboPay.connect(customer).rentRobot(
                "ORDER-004",
                "RF-01",
                "Human Following Robot",
                10,
                20,
                {
                    value: payment
                }
            )
        ).to.be.revert(ethers);
    });

    it("allows owner to end rental", async function () {
        const {
            roboPay,
            owner,
            customer
        } = await deployContract();

        const payment =
            await roboPay.requiredPayment("RF-01", 10);

        await roboPay.connect(customer).rentRobot(
            "ORDER-005",
            "RF-01",
            "Human Following Robot",
            10,
            20,
            {
                value: payment
            }
        );

        // Owner should be able to end the rental without reverting.
        await roboPay.connect(owner).endRental("ORDER-005");
    });

    it("rejects non-owner from ending rental", async function () {
        const {
            roboPay,
            customer,
            otherUser,
            ethers
        } = await deployContract();

        const payment =
            await roboPay.requiredPayment("RF-01", 10);

        await roboPay.connect(customer).rentRobot(
            "ORDER-006",
            "RF-01",
            "Human Following Robot",
            10,
            20,
            {
                value: payment
            }
        );

        await expect(
            roboPay.connect(otherUser).endRental("ORDER-006")
        ).to.be.revert(ethers);
    });
});
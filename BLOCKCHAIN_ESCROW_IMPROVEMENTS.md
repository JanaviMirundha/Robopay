# 🤖 RoboPay: Web3 Autonomous Robotics Platform Upgrade
## Architecture Documentation: On-Chain Escrow, Auto-Refund & Enterprise Telemetry

---

### 📌 Overview
This document outlines the major blockchain, backend, and frontend enhancements introduced to elevate **RoboPay** from a basic micro-payment demo into a secure, decentralized **Web3 Autonomous Robotics Protocol**.

---

### 1️⃣ Smart Contract Architecture: On-Chain Escrow & Auto-Refund (`RoboPay.sol`)

#### 🔒 The Problem with Traditional Web3 Rentals
Previously, when a user paid for a robot rental, the smart contract immediately transferred the funds to the admin/recipient wallet. If the robot encountered an unexpected hardware failure, obstruction, or if the customer needed to cancel immediately before deployment, the customer had no cryptographic guarantee of recovering their funds.

#### 🛡️ The On-Chain Escrow Solution
The upgraded `RoboPay.sol` smart contract now implements a **trustless On-Chain Escrow Mechanism**:

1. **Escrow Locking upon Rental Creation (`rentRobot`)**:
   - Customer deposits ETH into the contract.
   - The funds are **held safely in the smart contract's custody** (`escrowBalance`).
   - The rental record tracks:
     - `amountPaidWei`: Total ETH deposited.
     - `escrowBalance`: Current funds locked in escrow.
     - `customer`: Address authorized to claim refunds.
     - `startTime` & `durationMinutes`: Time-window for service.
     - State flags: `active`, `refunded`, `completed`.
   - Event emitted: `RentalCreated`.

2. **On-Chain Refund Guarantee (`refundRental`)**:
   - If a customer cancels an active session or an IoT automated check flags an obstruction/hardware error, `refundRental(orderId)` can be invoked directly on-chain by the customer or contract owner.
   - The contract verifies:
     ```solidity
     require(rental.active, "Rental is not active");
     require(!rental.refunded, "Already refunded");
     require(rental.escrowBalance > 0, "No escrow funds");
     require(msg.sender == rental.customer || msg.sender == owner, "Unauthorized");
     ```
   - Escrow balance is reset to 0 and the contract automatically transfers 100% of the funds back to `rental.customer`.
   - Event emitted: `RentalRefunded(orderId, customer, amountRefunded, timestamp)`.

3. **Escrow Settlement & Provider Payout (`completeRentalAndRelease`)**:
   - Once the service duration has elapsed (`block.timestamp >= startTime + (durationMinutes * 60)`), the escrow funds are unlocked and forwarded to `paymentRecipient`.
   - Events emitted: `RentalEnded` and `EscrowReleased`.

4. **Decentralized History Query (`getCustomerOrders`)**:
   - Added mapping `mapping(address => string[]) customerOrders`.
   - Any wallet can query their full on-chain order history (`getCustomerOrders(address)`) directly from the EVM without centralized database dependency.

5. **Universal Duration Pricing (ST-01 RoboTrolley)**:
   - Added on-chain support for `10 Mins (0.000005 ETH / ₹10)`, `20 Mins (0.000010 ETH / ₹20)`, and `30 Mins (0.000015 ETH / ₹30)`.

---

### 2️⃣ Test Suite Verification (`RoboPay.test.ts`)
The entire Hardhat test suite was upgraded and verified:
* `√ deploys with correct owner and payment recipient`
* `√ returns correct INR and ETH prices for RF-01, FC-01, and ST-01`
* `√ creates rental with correct payment and holds funds in escrow`
* `√ allows customer to claim refund from escrow and returns balance`
* `√ releases escrow to recipient upon completion`
* `√ rejects incorrect payments, invalid packages, and unauthorized callers`

**Result: 12 passing tests (0 failures).**

---

### 3️⃣ Backend API & Event Indexer (`backend/server.js`)

* **Contract Sanitization & Network Verification**:
  - Validates EVM addresses against Base Sepolia (`Chain ID 84532`) to prevent ENS resolution errors on non-ENS networks.
* **Escrow Refund Route (`POST /api/blockchain/refund-rental`)**:
  - Handles customer refund requests, updates order status to `REFUNDED`, and immediately restores the corresponding robot to `AVAILABLE`.
* **Customer Orders Lookup (`GET /api/orders/customer/:walletAddress`)**:
  - Serves customer-specific booking receipts and escrow transaction history.
* **Dual Payment Execution Modes**:
  - Live Base Sepolia smart contract verification via JSON-RPC.
  - 1-click Demo simulation bypass (`0xdemo...`) for instant offline demonstration.

---

### 4️⃣ Web3 Frontend & Real-Time IoT HUD (`frontend/src/App.jsx`)

1. **Auto-Switching to Base Sepolia Testnet (`wallet.js`)**:
   - Automatically detects active network and prompts MetaMask to switch to **Base Sepolia (Chain ID 84532)** or auto-adds the RPC (`https://sepolia.base.org`).

2. **On-Chain Escrow & Instant Refund Action**:
   - In the active rental session view, customers have an **"On-Chain Escrow Protected"** badge.
   - Provides a **"Cancel Service & Claim Instant On-Chain Refund"** button with real-time feedback and state restoration.

3. **Live IoT Fleet Telemetry HUD**:
   - During active robot sessions, renders a high-tech telemetry dashboard:
     - 📡 **360° LiDAR Scanner**: Live obstacle radar detection (`Clear - 2.4m`).
     - 🔋 **Power Cell**: Battery discharge monitoring (`0.14 A`).
     - ⚡ **Odometer & Work Metrics**:
       - *RoboFollow*: Distance guided in meters + cargo weight in kg.
       - *RoboClean*: Area disinfected in $m^2$ + UV-C status.
       - *RoboTrolley*: Cart payload weight in kg + scanned items count.

4. **"My Receipts & Escrow Activity" Modal**:
   - Navbar button with active order counter badge.
   - Interactive history modal showing:
     - Order ID & Timestamp.
     - Fleet Unit & Service Duration.
     - On-Chain Status (`🔒 In Escrow`, `✓ Completed`, `↩ Refunded`).
     - Direct clickable links to the transaction on **BaseScan Explorer**.
     - Refund trigger for active escrow bookings.

---

### 🚀 Running the Project

```powershell
# 1. Start Backend API (Port 5000)
cd backend
node server.js

# 2. Start Frontend UI (Port 5174 / 5173)
cd ../frontend
npm run dev

# 3. Run Smart Contract Test Suite
cd ../blockchain
npx hardhat test
```

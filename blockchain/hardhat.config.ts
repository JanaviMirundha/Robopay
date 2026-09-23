import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "dotenv/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],

  solidity: {
    version: "0.8.20",
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
  },

  test: {
    mocha: {
      timeout: 40000,
    },
  },

  networks: {
    baseSepolia: {
      type: "http",
      url: process.env.BASE_SEPOLIA_RPC_URL!,
      chainId: 84532,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
});
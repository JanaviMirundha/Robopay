import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

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
}); 
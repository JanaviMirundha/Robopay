import { ethers } from "ethers";

const BASE_SEPOLIA_CHAIN_ID = "0x14a34";

export async function connectMetaMask() {
    // Check MetaMask
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed in this browser.");
    }

    // STEP 1: Explicitly ask MetaMask to connect the account
    const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
        throw new Error("No MetaMask account was connected.");
    }

    // STEP 2: Check current network
    let currentChainId = await window.ethereum.request({
        method: "eth_chainId",
    });

    // STEP 3: Switch to Base Sepolia
    if (currentChainId !== BASE_SEPOLIA_CHAIN_ID) {
        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [
                    {
                        chainId: BASE_SEPOLIA_CHAIN_ID,
                    },
                ],
            });
        } catch (error) {

            // Base Sepolia not added
            if (error.code === 4902) {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [
                        {
                            chainId: BASE_SEPOLIA_CHAIN_ID,
                            chainName: "Base Sepolia",
                            nativeCurrency: {
                                name: "Ether",
                                symbol: "ETH",
                                decimals: 18,
                            },
                            rpcUrls: [
                                "https://sepolia.base.org",
                            ],
                            blockExplorerUrls: [
                                "https://sepolia.basescan.org",
                            ],
                        },
                    ],
                });
            } else {
                throw error;
            }
        }
    }

    // STEP 4: Create ethers provider
    const provider = new ethers.BrowserProvider(
        window.ethereum
    );

    // STEP 5: Get connected signer
    const signer = await provider.getSigner();

    // STEP 6: Get wallet address
    const address = await signer.getAddress();

    return {
        provider,
        signer,
        address,
    };
}
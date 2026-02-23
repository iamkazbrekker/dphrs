import { createPublicClient, createWalletClient, custom, http, getContract } from "viem";
import { hardhat } from "viem/chains";
import config from "./contract-config.json";

/**
 * Returns a viem contract instance connected to MetaMask.
 * Throws if MetaMask is not installed or the user rejects connection.
 */
export async function getContractInstance() {
    if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask is required. Please install it.");
    }

    // Request wallet access
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Validate and switch network
    const chainIdHex = `0x${config.chainId.toString(16)}`;
    const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
    if (currentChainId !== chainIdHex) {
        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: chainIdHex }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [{
                        chainId: chainIdHex,
                        chainName: "Hardhat Local",
                        rpcUrls: ["http://127.0.0.1:8545"],
                        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
                    }],
                });
            } else {
                throw switchError;
            }
        }
    }

    const walletClient = createWalletClient({
        chain: hardhat,
        transport: custom(window.ethereum),
    });

    const [address] = await walletClient.getAddresses();

    // Explicitly update the wallet client to use THIS specific address
    const accountWalletClient = createWalletClient({
        account: address,
        chain: hardhat,
        transport: custom(window.ethereum),
    });


    const publicClient = createPublicClient({
        chain: hardhat,
        transport: http("http://127.0.0.1:8545"),
    });

    const contract = getContract({
        address: config.address,
        abi: config.abi,
        client: { public: publicClient, wallet: accountWalletClient },
    });

    return { contract, walletClient: accountWalletClient, publicClient, address };
}

/**
 * Returns the currently connected wallet address.
 */
export async function getCurrentAddress() {
    if (!window.ethereum) return null;
    const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return address;
}

/**
 * Forces MetaMask to prompt account selection permissions.
 */
export async function promptAccountSwitch() {
    if (!window.ethereum) return;
    await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
    });
}

export const CONTRACT_CHAIN_ID = config.chainId; // 31337

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { abi as BridgePoolABI } from "../artifacts/contracts/BridgePool.sol/BridgePool.json";
import { abi as BridgeTokenABI } from "../artifacts/contracts/BridgeToken.sol/BridgeToken.json";
import dotenv from "dotenv";
dotenv.config();

const SIDE_RPC_URL = process.env.SIDE_RPC_URL;
const UZHETH_RPC_URL = process.env.UZHETH_RPC_URL;

const SIDE_PRIVATE_KEY = process.env.SIDE_PRIVATE_KEY;
const UZHETH_PRIVATE_KEY = process.env.UZHETH_PRIVATE_KEY;

async function main() {
    const deployedContracts = readFileSync("deployed-contracts.json", "utf8");
    const deployedContractsJson = JSON.parse(deployedContracts);
    
    const bridgePoolAddressSIDE = deployedContractsJson["SIDE"]["bridgePool"];
    const bridgePoolAddressUZHETH = deployedContractsJson["UZHETH"]["bridgePool"];
    const bridgeTokenAddressSIDE = deployedContractsJson["SIDE"]["bridgeToken"];
    const bridgeTokenAddressUZHETH = deployedContractsJson["UZHETH"]["bridgeToken"];
    
    let httpProviderSIDE = new ethers.providers.JsonRpcProvider(SIDE_RPC_URL);
    let walletSIDE = new ethers.Wallet(SIDE_PRIVATE_KEY!, httpProviderSIDE);
    
    const bridgePoolSIDE = new ethers.Contract(
        bridgePoolAddressSIDE,
        BridgePoolABI,
        httpProviderSIDE
    );

    const bridgeTokenSIDE = new ethers.Contract(
        bridgeTokenAddressSIDE,
        BridgeTokenABI,
        httpProviderSIDE
    );
    
    let httpProviderUZHETH = new ethers.providers.JsonRpcProvider(UZHETH_RPC_URL);
    let walletUZHETH = new ethers.Wallet(UZHETH_PRIVATE_KEY!, httpProviderUZHETH);
    
    const bridgePoolUZHETH = new ethers.Contract(
        bridgePoolAddressUZHETH,
        BridgePoolABI,
        httpProviderUZHETH
    );
    
    // call deposit function on SIDE blockchain depositing 10 tokens to
    // UZHETH blockchain address: 0x39A9C8B6E6DCd15F3982fE4f24a434BFcd4B6931
    const targetAddress = "0x391ABF65aE48F2A3dc358eBf925B84a02aac7a17";
    // check the balance of the wallet before depositing
    const balance = await httpProviderSIDE.getBalance(walletSIDE.address);
    console.log(`Balance of the wallet ${walletSIDE.address} before depositing: ${balance.toString()}`)
    // approve the bridgePool to spend the tokens
    await bridgeTokenSIDE.connect(walletSIDE).approve(bridgePoolAddressSIDE, ethers.utils.parseEther("100"));
    const allowance = await bridgeTokenSIDE.allowance(walletSIDE.address, bridgePoolAddressSIDE);
    console.log(`Allowance of the wallet ${walletSIDE.address} before depositing: ${allowance.toString()}`)
    // token balance of the wallet
    const tokenBalance = await bridgeTokenSIDE.balanceOf(walletSIDE.address);
    console.log(`Token balance of the wallet ${walletSIDE.address} before depositing: ${tokenBalance.toString()}`)
    const ammount_wei = ethers.utils.parseEther("1");
    bridgePoolSIDE.connect(walletSIDE).deposit(ammount_wei, targetAddress, {gasLimit: 1000000});
    console.log("Deposit function called on SIDE blockchain");
    console.log("Depositing 10 Bridge tokens to UZHETH blockchain address: " + targetAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

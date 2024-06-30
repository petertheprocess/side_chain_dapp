import { ethers } from "ethers";
import { readFileSync } from "fs";
import { abi as BridgePoolABI } from "../artifacts/contracts/BridgePool.sol/BridgePool.json";
import dotenv from "dotenv";

dotenv.config();

const SIDE_RPC_URL = process.env.SIDE_RPC_URL;
const UZHETH_RPC_URL = process.env.UZHETH_RPC_URL;

const SIDE_PRIVATE_KEY = process.env.SIDE_PRIVATE_KEY;
const UZHETH_PRIVATE_KEY = process.env.UZHETH_PRIVATE_KEY;

async function main() {
  const deployedContracts = readFileSync("deployed-contracts.json", "utf8");
  const deployedContractsJson = JSON.parse(deployedContracts);

  const bridgePoolAddressSIDE =
    deployedContractsJson["SIDE"]["bridgePool"];
  const bridgePoolAddressUZHETH = deployedContractsJson["UZHETH"]["bridgePool"];

  let httpProviderSIDE = new ethers.providers.JsonRpcProvider(
    SIDE_RPC_URL
  );

  let walletSIDE = new ethers.Wallet(
    SIDE_PRIVATE_KEY!,
    httpProviderSIDE
  );

  const bridgePoolSIDE = new ethers.Contract(
    bridgePoolAddressSIDE,
    BridgePoolABI,
    httpProviderSIDE
  );

  let httpProviderUZHETH = new ethers.providers.JsonRpcProvider(UZHETH_RPC_URL);
  let walletUZHETH = new ethers.Wallet(UZHETH_PRIVATE_KEY!, httpProviderUZHETH);

  const bridgePoolUZHETH = new ethers.Contract(
    bridgePoolAddressUZHETH,
    BridgePoolABI,
    httpProviderUZHETH
  );

  bridgePoolSIDE.on("Deposit", (depostID, sender, receiver, amount) => {
    console.log("Deposit event triggered on SIDE blockchain");

    bridgePoolUZHETH
      .connect(walletUZHETH)
      .executeBridge(depostID, receiver, amount, { gasLimit: 1000000 });
  });

  bridgePoolUZHETH.on("Deposit", (depostID, sender, receiver, amount) => {
    console.log("Deposit event triggered on UZHETH blockchain");

    bridgePoolSIDE
      .connect(walletSIDE)
      .executeBridge(depostID, receiver, amount, { gasLimit: 1000000 });
  });

  bridgePoolSIDE.on("ExecuteBridge", () => {
    console.log("ExecuteBridge event triggered on SIDE blockchain");
  });

  bridgePoolUZHETH.on("ExecuteBridge", () => {
    console.log("ExecuteBridge event triggered on UZHETH blockchain");
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

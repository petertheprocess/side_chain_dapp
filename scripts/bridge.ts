import { ethers } from "ethers";
import { readFileSync } from "fs";
import { abi as BridgePoolABI } from "../artifacts/contracts/BridgePool.sol/BridgePool.json";
import dotenv from "dotenv";

dotenv.config();

const SIDE_RPC_URL = process.env.SIDE_RPC_URL;
const UZHETH_RPC_URL = process.env.UZHETH_RPC_URL;

const SIDE_PRIVATE_KEY = process.env.SIDE_PRIVATE_KEY;
const UZHETH_PRIVATE_KEY = process.env.UZHETH_PRIVATE_KEY;

type TokenHolder = {
  address: string;
  privateKey: string;
};

async function main() {
  const deployedContracts = readFileSync("deployed-contracts.json", "utf8");
  const deployedContractsJson = JSON.parse(deployedContracts);

  const bridgePoolAddressSIDE =
    deployedContractsJson["SIDE"]["bridgePool"];
  const bridgePoolAddressUZHETH = deployedContractsJson["UZHETH"]["bridgePool"];


  let httpProviderSIDE = new ethers.providers.JsonRpcProvider(
    SIDE_RPC_URL
  );
  let httpProviderUZHETH = new ethers.providers.JsonRpcProvider(UZHETH_RPC_URL);

  const holders = JSON.parse(readFileSync("token_holders.json", "utf8"));

  holders.forEach(async (holder: TokenHolder) => {
    let walletSIDE = new ethers.Wallet(
      holder.privateKey,
      httpProviderSIDE
    );

    let executedDepositsUZHETH: Set<string> = new Set();
    let executedDepositsSIDE: Set<string> = new Set();

    const shortAddress = holder.address.substring(0, 5);

    const bridgePoolSIDE = new ethers.Contract(
      bridgePoolAddressSIDE,
      BridgePoolABI,
      httpProviderSIDE
    );

    let walletUZHETH = new ethers.Wallet(holder.privateKey, httpProviderUZHETH);

    const bridgePoolUZHETH = new ethers.Contract(
      bridgePoolAddressUZHETH,
      BridgePoolABI,
      httpProviderUZHETH
    );

    bridgePoolSIDE.on("ExecuteBridge", (depositId, node, receiver, amount) => {
      if (executedDepositsSIDE.has(depositId.toString())) {
        return;
      }
      executedDepositsSIDE.add(depositId.toString());
      console.log("executedDepositsSIDE_b", executedDepositsSIDE);
    });

    bridgePoolUZHETH.on("ExecuteBridge", (depositId, node, receiver, amount) => {
      if (executedDepositsUZHETH.has(depositId.toString())) {
        console.log("Already executed depositId on UZHETH");
        console.log(executedDepositsUZHETH)
        return;
      }
      executedDepositsUZHETH.add(depositId.toString());
      console.log("executedDepositsUZHETH_b", executedDepositsUZHETH);
    });

    bridgePoolSIDE.on("Deposit", (depositId, sender, receiver, amount) => {
      console.log("executedDepositsUZHETH", executedDepositsUZHETH);
      if (executedDepositsUZHETH.has(depositId.toString())) {
        console.log("Already executed depositId on UZHETH");
        console.log(executedDepositsUZHETH)
        return;
      }
      bridgePoolUZHETH
        .connect(walletUZHETH)
        .executeBridge(depositId, receiver, amount, { gasLimit: 1000000 })
        .then(() => {
          const time = new Date().toLocaleTimeString();
          console.log(`[${time}-${shortAddress}:] ExecuteBridge for depositId ${depositId} event triggered on UZHETH blockchain`);
        })
        .catch((error) => {
          const time = new Date().toLocaleTimeString();
          console.warn(`[${time}-${shortAddress}:] ${error.body}`);
        });
    });
    bridgePoolUZHETH.on("Deposit", (depositId, sender, receiver, amount) => {
      if (executedDepositsSIDE.has(depositId.toString())) {
        return;
      }
      bridgePoolSIDE
        .connect(walletSIDE)
        .executeBridge(depositId, receiver, amount, { gasLimit: 1000000 })
        .then(() => {
          const time = new Date().toLocaleTimeString();
          console.log(`[${time}-${shortAddress}:] ExecuteBridge for depositId ${depositId} event triggered on SIDE blockchain`)
        })
        .catch((error) => {
          const time = new Date().toLocaleTimeString();
          console.warn(`[${time}-${shortAddress}:] ${error.body}`);
        });
    });

  });

  // spin while waiting for events
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}



main().catch((error) => {
  console.error(error);
});

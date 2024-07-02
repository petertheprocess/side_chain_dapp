import { ethers } from "ethers";
import { readFileSync } from "fs";
import { abi as BridgePoolABI } from "../artifacts/contracts/BridgePool.sol/BridgePool.json";
import { abi as BridgeTokenABI } from "../artifacts/contracts/BridgeToken.sol/BridgeToken.json";
import dotenv from "dotenv";

dotenv.config();

const SIDE_RPC_URL = process.env.SIDE_RPC_URL;
const UZHETH_RPC_URL = process.env.UZHETH_RPC_URL;

type TokenHolder = {
  address: string;
  privateKey: string;
};

const stakeAmount = "1000";

async function main() {
  const deployedContracts = readFileSync("deployed-contracts.json", "utf8");
  const deployedContractsJson = JSON.parse(deployedContracts);

  const bridgePoolAddressSIDE =
    deployedContractsJson["SIDE"]["bridgePool"];
  const bridgePoolAddressUZHETH = deployedContractsJson["UZHETH"]["bridgePool"];

  const bridgeTokenAddressSIDE =
    deployedContractsJson["SIDE"]["bridgeToken"];
  const bridgeTokenAddressUZHETH =
    deployedContractsJson["UZHETH"]["bridgeToken"];

  const tokenHolders = JSON.parse(readFileSync("token_holders.json", "utf8"));

  tokenHolders.forEach(async (holder: TokenHolder) => {
    if (!holder.address || !holder.privateKey) {
      throw new Error("Invalid token holder object");
    }

    let httpProviderSIDE = new ethers.providers.JsonRpcProvider(
      SIDE_RPC_URL
    );
    let walletSIDE = new ethers.Wallet(
      holder.privateKey,
      httpProviderSIDE
    );
    let httpProviderUZHETH = new ethers.providers.JsonRpcProvider(UZHETH_RPC_URL);
    let walletUZHETH = new ethers.Wallet(holder.privateKey, httpProviderUZHETH);

    const bridgeTokenSIDE = new ethers.Contract(
      bridgeTokenAddressSIDE,
      BridgeTokenABI,
      httpProviderSIDE
    );
    const bridgePoolSIDE = new ethers.Contract(
      bridgePoolAddressSIDE,
      BridgePoolABI,
      httpProviderSIDE
    );
    const bridgeTokenUZHETH = new ethers.Contract(
      bridgeTokenAddressUZHETH,
      BridgeTokenABI,
      httpProviderUZHETH
    );
    const bridgeContractUZHETH = new ethers.Contract(
      bridgePoolAddressUZHETH,
      BridgePoolABI,
      httpProviderUZHETH
    );

    // Approve and stake tokens
    const approveSIDETx = await bridgeTokenSIDE
      .connect(walletSIDE)
      .approve(bridgePoolSIDE.address, ethers.utils.parseEther(stakeAmount), { gasLimit: 1000000 });
    await approveSIDETx.wait();

    const stakeSIDETx = await bridgePoolSIDE
      .connect(walletSIDE)
      .stake(ethers.utils.parseEther(stakeAmount), { gasLimit: 1000000 });
    await stakeSIDETx.wait();

    const approveUZHETHTx = await bridgeTokenUZHETH
      .connect(walletUZHETH)
      .approve(bridgeContractUZHETH.address, ethers.utils.parseEther(stakeAmount), { gasLimit: 1000000 });
    await approveUZHETHTx.wait();

    const stakeUZHETHTx = await bridgeContractUZHETH
      .connect(walletUZHETH)
      .stake(ethers.utils.parseEther(stakeAmount), { gasLimit: 1000000 });
    await stakeUZHETHTx.wait();
    console.log(`Successfully staked tokens for ${holder.address} in both networks`);
  });
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

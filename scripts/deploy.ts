import hre from "hardhat";
import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";

async function main() {
  const networkName = hre.network.name;
  const jsonName = `deployed-contracts.json`
  const tokenHoldersJson = JSON.parse(readFileSync("token_holders.json", "utf8"));
  const tokenHolders = tokenHoldersJson.map((holder) => holder.address);
  console.log("Token holders for network: " + networkName);
  console.log(tokenHolders);
  console.log("Deploying contracts to network: " + networkName + " ...");

  const BridgeToken = await ethers.getContractFactory("BridgeToken");
  // Change the arguments to the constructor of BridgeToken
  const bridgeToken = await BridgeToken.deploy(tokenHolders);
  await bridgeToken.deployed();

  const BridgePool = await ethers.getContractFactory("BridgePool");
  const bridgePool = await BridgePool.deploy(bridgeToken.address);
  await bridgePool.deployed();

  const deployedContractsJson = existsSync(jsonName)
    ? JSON.parse(readFileSync(jsonName, "utf8"))
    : {};

  console.log("Contracts deployed to network: " + networkName);

  deployedContractsJson[networkName] = {
    bridgeToken: bridgeToken.address,
    bridgePool: bridgePool.address,
  };

  writeFileSync(
    jsonName,
    JSON.stringify(deployedContractsJson, null, 2),
    { flag: "w", encoding: "utf8" }
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import hre from "hardhat";
import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";

async function main() {
  const networkName = hre.network.name;
  const jsonName = `deployed-contracts.json`
  console.log("Token holders for network: " + networkName);
  console.log("Deploying Dice contracts to network: " + networkName + " ...");

  const deployedContractsJson = existsSync(jsonName)
    ? JSON.parse(readFileSync(jsonName, "utf8"))
    : {};
  // query the deployed bridgeToken address from the deployed-contracts.json file
  // if bridgeToken is not deployed, throw an error and exit
  let bridgeTokenAddress;
  // check if the bridgeToken contract is deployed safely without any errors
  try {
    bridgeTokenAddress = deployedContractsJson[networkName]["bridgeToken"];
  } catch (error) {
    console.error("BridgeToken contract not deployed on network: " + networkName);
    console.error("Please deploy the BridgeToken contract by run 'npx hardhat scripts/deploy.ts --network " + networkName + "' first.");
    process.exit(1);
  }

  console.log("BridgeToken address: " + bridgeTokenAddress);
  const DiceGame= await ethers.getContractFactory("DiceGame");
  const diceGame= await DiceGame.deploy(bridgeTokenAddress);
  await diceGame.deployed();


  console.log("Contracts deployed to network: " + networkName);

  deployedContractsJson[networkName] = {
    ...deployedContractsJson[networkName],
    diceGame: diceGame.address,
  };
  console.log("Deployed DiceGame contract address: " + diceGame.address);

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

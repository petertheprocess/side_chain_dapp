# Disclaimer
This repo is code for UZH course project: [Blockchain Programming](https://www.ifi.uzh.ch/en/bdlt/Teaching/Blockchain-Programming.html). Code are heavily borrowed from the original repo: [Bridge](https://github.com/kitanovicd/Bridge). We extend the original project with a new smart contract called *DiceGame*, and some minor changes on scripts and contracts. The main functionality and bridging mechanism are the same as the original one. And a very simple react app is added to interact with the Token Bridging.

# Introduction

This repository contains *BridgeToken*, *BridgePool* and *DiceGame* smart contracts. Both *BridgeXXX* smart contract should be deployed to SIDE and UZHETH chains. And the *DiceGame* can be deployed on either one. This repository also contains script that should be executed by validator. Project represents bridge (not production ready) between this two chains. After initial mint of token inside deployment transaction, token can not be minted nor burned anymore. When user wants to bridge tokens from origin to destination chain, tokens will be transfered to *BridgePool* smart contract on origin chain and will be transfered from *BridgePool* contract on destination chain to receiving address. Bridging is done by validator. To become validator one must stake *BridgeToken* on *BridgePool* contract.

## BridgeToken

Simple *ERC20* token with fixed supply that is initialy minted in deployment transaction. Initial supply is minted when smart contract is deployed. Initial supply represents total supply and can not be increased or decreased.

## BridgePool

The *BridgePool* contract implements a bridge pool that allows users to deposit tokens on one blockchain and execute a bridge transfer to receive the equivalent tokens on the other blockchain. It also supports staking and voting to blacklist bridge validators. Inside smart contract lock period is defined. When validator executes a bridge transfer he can not execute another bridge transfer until lock period expires. Purpose of this functionality is to protect tokens on *BridgePool* smart contract from validators. Also validator can not execute bridge transfers if bridging amount is bigger then 10% of staked amount of validator. With this two protections smart contract is protected from *bad* validators. If one validator executes fake transfer he will steal maximum of 10% tokens but will lose whole stake portion. Node can lose stake portion if other validators vote to blacklist him. When validator successfully executes bridging transaction he is rewarded with 5% of bridging amount.

## DiceGame

The *DiceGame* contract is a simple dice game that allows users to bet on the outcome of a dice roll. The contract is deployed on the SIDE chain. But it can be deployed on any chain, it spend tokens from *BridgeToken* contract. The deployer of this contract became Houser of the game and other users can deposit and put bet. If the user wins, he get double amount of tokens he bet. If the user loses, he loses the amount of tokens he bet.

### Functions
```cpp
function deposit(uint256 amount, address receiver)
```
Allows a user to deposit tokens into the bridge pool, specifying the amount and the receiver's address. First, BrigdePool must have allowance to spend given amount of BridgeToken.

```cpp
function executeBridge(uint256 originChainDepositID, address receiver, uint256 amount)
```
Executes a bridge transfer from the other blockchain to the current blockchain. Only bridge validators can call this function.

```cpp
function stake(uint256 amount)
```
Stakes tokens in the bridge pool to become a bridge validator.

```cpp
function unstake(uint256 amount) Unstakes tokens from the bridge pool.
```
Unstakes tokens. Unstaked portion is send to caller.

```cpp
function voteToBlacklistNode(address validator)
```
Votes to blacklist a bridge validator.

## Setup and usage

1. Clone the repository
```bash
git clone https://github.com/petertheprocess/side_chain_dapp.git
```
2. Install dependencies
```bash
cd bridge
npm install
```
3. Configure environment variables
* Create a .env file in the project root.
* Set the following variables:

```makefile
SIDE_RPC_URL=<SIDE RPC URL>
UZHETH_RPC_URL=<UZHETH RPC URL>
SIDE_PRIVATE_KEY=<SIDE private key>
UZHETH_PRIVATE_KEY=<UZHETH private key>
```

4. Deploy the bridge contracts<br>
* Create a pre-founded addresses in the token_holders.json file in the project root. The file should look like this:
```json
[
    {
        "address": "YOUR_ADDRESS0",
        "privateKey": "YOUR_PRIVATE_KEY0"
    },
    {
        "address": "YOUR_ADDRESS1",
        "privateKey": "YOUR_PRIVATE_KEY1"
    },
    {
        "address": "YOUR_ADDRESS2",
        "privateKey": "YOUR_PRIVATE_KEY2"
    },
    {
        "address": "YOUR_ADDRESS3",
        "privateKey": "YOUR_PRIVATE_KEY3"
    },
    {
        "address": "YOUR_ADDRESS4",
        "privateKey": "YOUR_PRIVATE_KEY4"
    }
]
```

```bash
npx hardhat run scripts/deploy.js --network SIDE
npx hardhat run scripts/deploy.js --network UZHETH
```

5. Run the scripts
By default, we use token_holders.json file to get addresses and private keys. If you want to use different file, you can specify it in the script.
* To stake the tokens and become validator:
```bash
npx hardhat run ./scripts/stake.ts
```
* To listen for deposit events and trigger bridge transfers:
```bash
npx hardhat run ./scripts/bridge.ts
```

6. Deploy the DiceGame contract
```bash
npx hardhat run scripts/deployGame.js --network SIDE
```

7. Run the Client
copy the atifacts to the client folder
```bash
cp -r artifacts client/src/
```
Fill up the client/constents.js with the contract addresses and RPC urls 

Run the react app following the instructions in the client folder

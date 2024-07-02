import { RPC_MAP, TOKEN_ADDRESS_MAP, BRIDGE_ADDRESS_MAP } from "../constants";
import { bridgeAbi, tokenAbi, UZHETHCHAIN_ID, SIDECHAIN_ID } from "../constants";
import React, { useState, useEffect } from "react";
import { MetaMaskProvider, useSDK } from "@metamask/sdk-react";
import PropTypes from "prop-types";
import { ethers } from "ethers";
import "./BridgePage.scss";


const BridgeForm = (prop) => {
    const header = prop.isUZHETH ? "Transfer to SIDECHAIN" : "Transfer to UZHETH";
    const [amount, setAmount] = useState("0");
    const [recipient, setRecipient] = useState("");

    const handleTransfer = async (currentAccount) => {
        console.log("transfer");
        const web3 = new ethers.providers.Web3Provider(window.ethereum);
        const bridgeTokenAddress = TOKEN_ADDRESS_MAP[parseInt(prop.chainIdStr)];
        const bridgeTokenContract = new ethers.Contract(bridgeTokenAddress, tokenAbi, web3);
        const bridgePoolAddress = BRIDGE_ADDRESS_MAP[parseInt(prop.chainIdStr)];
        const bridgePoolContract = new ethers.Contract(bridgePoolAddress, bridgeAbi, web3);
        const bridgeTokenBalance = await bridgeTokenContract.balanceOf(currentAccount);
        console.log("bridge token balance", ethers.utils.formatEther(bridgeTokenBalance));
        const wallet = web3.getSigner();
        const amountToSend = ethers.utils.parseEther(amount);
        // approve the bridge pool to spend the token
        await bridgeTokenContract
            .connect(wallet)
            .approve(bridgePoolAddress, amountToSend, { gasLimit: 1000000 })
            .catch((err) => {
                console.error("approve error", err);
            });
        await bridgePoolContract
            .connect(wallet)
            .deposit(amountToSend, recipient, { gasLimit: 1000000 })
            .catch((err) => {
                console.error("deposit error", err);
            });
    }

    return (
        <div className="bridge-form">
            <h2>{header}</h2>
            <label>
                Amount:
                <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label>
                Recipient:
                <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)}/>
            </label>
            <button 
                onClick={() => handleTransfer(prop.currentAccount)}>Transfer</button>
        </div>
    );
}

BridgeForm.propTypes = {
    isUZHETH: PropTypes.bool.isRequired,
    currentAccount: PropTypes.string.isRequired,
    chainIdStr: PropTypes.string.isRequired
}

function makeBridgePoolStatus(maxStake, nodeCount, totalStake) {
    return {
        maxStake: maxStake,
        nodeCount: nodeCount,
        totalStake: totalStake
    }
}

const getBrideState = async (contract) => {
    // collect all events from the bridge contract
    // find the max state amount and return it
    const events = await contract.queryFilter('Stake');
    // find the max amount
    let maxAmount = 0;
    for (const event of events) {
        if (event.args.amount.gt(maxAmount)) {
            maxAmount = event.args.amount;
        }
    }
    console.log("max Amount", ethers.utils.formatEther(maxAmount));
    console.log("total events", events.length);
    console.log("events", events);
    return maxAmount;
}


const Bridge = () => {
    const [accounts, setAccounts] = useState([]);
    const { sdk, connected, connecting, provider, chainId } = useSDK();
    const [bridgeTokenBalance, setBridgeTokenBalance] = useState(0);
    const [ethBalance, setEthBalance] = useState("0");
    const [currentAccount, setCurrentAccount] = useState(null);
    useEffect(() => {
        console.log("reconnect");
        const connectAndGetBalance = async () => {
            const accounts = await sdk?.connect();
            setAccounts(accounts);
            if (chainId && accounts && ethers.utils.isAddress(accounts[0])) {
                const web3 = new ethers.providers.Web3Provider(window.ethereum);
                const ethBalance = await web3.getBalance(accounts[0]);
                setEthBalance(ethers.utils.formatEther(ethBalance));
                setCurrentAccount(accounts[0]);
                // get bridge token balance
                const bridgeTokenAddress = TOKEN_ADDRESS_MAP[parseInt(chainId)];
                const bridgeTokenContract = new ethers.Contract(bridgeTokenAddress, tokenAbi, web3);
                // console.log("accounts", accounts);
                // console.log("bridge token address", bridgeTokenAddress);
                const bridgeTokenBalance = await bridgeTokenContract.balanceOf(accounts[0])
                setBridgeTokenBalance(ethers.utils.formatEther(bridgeTokenBalance));
            }
        };
        const handleAccountChange = (acc) => {
            setAccounts(acc);
            setCurrentAccount(acc[0]);
        }
        connectAndGetBalance();
        window.ethereum.on("accountsChanged", handleAccountChange);

        // getBrideState(new ethers.Contract(BRIDGE_ADDRESS_MAP[SIDECHAIN_ID], bridgeAbi, new ethers.providers.Web3Provider(window.ethereum)));

        return () => {
            window.ethereum.removeListener("accountsChanged", handleAccountChange);
        }
    }, [chainId, currentAccount]);



    const handleListAccounts = async () => {
        const ats = await window.ethereum.request({
            "method": "eth_accounts",
            "params": []
        });
        console.log("accounts", ats);
    }


    return (
        <div className="bridge">
            {connected && (
                <div>
                    <>
                        <button onClick={handleListAccounts}>List Balances</button>
                        <p></p>
                        {chainId && `Connected chain: ${getChainName(chainId)}`}
                        <p>Accounts:</p>
                        {accounts && <ul>
                            {accounts.map((account) => (
                                <li key={account}>{account}</li>
                            ))}
                        </ul>}
                        <p>ETH Balance: {ethBalance}</p>
                        <p>Bridge Token Balance: {bridgeTokenBalance}</p>
                    </>
                    {
                        currentAccount && (
                        <BridgeForm 
                            chainIdStr={chainId}
                            isUZHETH={parseInt(chainId) === UZHETHCHAIN_ID}
                            currentAccount={currentAccount}
                        />)
                    }
                </div>
            )}
        </div>
    );
};

const getChainName = (chainId) => {
    for (const [id, rpc] of Object.entries(RPC_MAP)) {
        if (parseInt(id) === parseInt(chainId)) {
            return rpc;
        }
    }
    console.warn("Unknown chain id", chainId);
    return "Unknown";
}

const BridgePage = () => {
    return (
        <MetaMaskProvider
            sdkOptions={{
                dappMetadata: {
                    name: "Bridge",
                    url: window.location.href,
                },
                infuraAPIKey: "0d1e7f7b6b4b4c9f8f8f8f8f8f8f8f8f",
            }}>
            <Bridge />
        </MetaMaskProvider>
    )
};

export default BridgePage;


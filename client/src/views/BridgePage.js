import { RPC_MAP, TOKEN_ADDRESS_MAP, BRIDGE_ADDRESS_MAP, DICE_ADDRESS_MAP } from "../constants";
import { bridgeAbi, tokenAbi, UZHETHCHAIN_ID, SIDECHAIN_ID } from "../constants";
import React, { useState, useEffect } from "react";
import { MetaMaskProvider, useSDK } from "@metamask/sdk-react";
import PropTypes from "prop-types";
import { ethers } from "ethers";
import "./BridgePage.scss";
import bridgeTokenContractJson from "../artifacts/contracts/BridgeToken.sol/BridgeToken.json";
import bridgePoolContractJson from "../artifacts/contracts/BridgePool.sol/BridgePool.json";
import diceGameContractJson from "../artifacts/contracts/DiceGame.sol/DiceGame.json";
const bridgeTokenAbi = bridgeTokenContractJson.abi;
const bridgePoolAbi = bridgePoolContractJson.abi;
const diceGameAbi = diceGameContractJson.abi;

const DiceGameForm = (prop) => {
    const [balance, setBalance] = useState('');
    const [toDepositAmount, setToDepositAmount] = useState('');
    const [toBetAmount, setToBetAmount] = useState('');
    const [betAmount, setBetAmount] = useState('');
    const [diceNumber, setDiceNumber] = useState(-1);
    const [houseBalance, setHouseBalance] = useState('');
    const [houseAddress, setHouseAddress] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [isHouse, setIsHouse] = useState(false);
    useEffect(() => {
        const web3 = new ethers.providers.Web3Provider(window.ethereum);
        const diceGameAddress = DICE_ADDRESS_MAP[parseInt(prop.chainIdStr)];
        const diceGameContract = new ethers.Contract(diceGameAddress, diceGameAbi, web3);
        const fetchBalance = async () => {
            const balance = await diceGameContract.balanceOf(prop.currentAccount);
            setBalance(ethers.utils.formatEther(balance));
            const houseBalance = await diceGameContract.getHouseBalance();
            setHouseBalance(ethers.utils.formatEther(houseBalance));
            const bet = await diceGameContract.getBet();
            setBetAmount(ethers.utils.formatEther(bet));
            const houseAddress = await diceGameContract.getHouseAddress();
            setHouseAddress(houseAddress);
            console.log("house address:", houseAddress);
            console.log("current account:", prop.currentAccount);
            if (parseInt(houseAddress, 16) === parseInt(prop.currentAccount, 16)) {
                setIsHouse(true);
                console.log("is house, set is house to true");
            } else {
                console.log("is not house, set is house to false");
                setIsHouse(false);
            }
        }
        fetchBalance();
    }, [prop.chainIdStr, prop.currentAccount]);

    const handleLogin = async (currentAccount) => {
        const web3 = new ethers.providers.Web3Provider(window.ethereum);
        const diceGameAddress = DICE_ADDRESS_MAP[parseInt(prop.chainIdStr)];
        const diceGameContract = new ethers.Contract(diceGameAddress, diceGameAbi, web3);
        await diceGameContract.
            connect(web3.getSigner()).
            login(name, age, { gasLimit: 1000000 }).
            catch((err) => {
                console.info("maybe already logged in");
                console.error("login error", err);
            });
        const balance = await diceGameContract.balanceOf(currentAccount);
        setBalance(ethers.utils.formatEther(balance));
        const houseBalance = await diceGameContract.getHouseBalance();
        setHouseBalance(ethers.utils.formatEther(houseBalance));
        const bet = await diceGameContract.connect(web3.getSigner()).getBet();
        setBetAmount(ethers.utils.formatEther(bet));
        const houseAddress = await diceGameContract.getHouseAddress();
        setHouseAddress(houseAddress);
    }

    const handleBet = async (currentAccount) => {
        const web3 = new ethers.providers.Web3Provider(window.ethereum);
        const diceGameAddress = DICE_ADDRESS_MAP[parseInt(prop.chainIdStr)];
        const diceGameContract = new ethers.Contract(diceGameAddress, diceGameAbi, web3);
        const wallet = web3.getSigner();
        const amountToBet = ethers.utils.parseEther(toBetAmount);
        console.log("amount to bet", amountToBet);
        await diceGameContract
            .connect(wallet)
            .putBet(amountToBet, { gasLimit: 1000000 })
            .catch((err) => {
                console.error("bet error", err);
            });
        const balance = await diceGameContract.balanceOf(currentAccount);
        const bet = await diceGameContract.connect(wallet).getBet();
        setBetAmount(ethers.utils.formatEther(bet));

        setBalance(ethers.utils.formatEther(balance));
        const houseBalance = await diceGameContract.getHouseBalance();
        setHouseBalance(ethers.utils.formatEther(houseBalance));
    }

    const handleRoll = async (currentAccount) => {
        const web3 = new ethers.providers.Web3Provider(window.ethereum);
        const diceGameAddress = DICE_ADDRESS_MAP[parseInt(prop.chainIdStr)];
        const diceGameContract = new ethers.Contract(diceGameAddress, diceGameAbi, web3);
        const wallet = web3.getSigner();
        const diceTx = await diceGameContract
            .connect(wallet)
            .rollDice({ gasLimit: 1000000 })
            .catch((err) => {
                console.error("roll error", err);
            });
        if (diceTx === undefined) {
            return;
        }
        const diceReceipt = await diceTx.wait();
        console.log("diceReceipt", diceReceipt);
        if (diceReceipt.events.length === 1) {
            const diceHex = diceReceipt.events[0].data;
            // convert hex string to decimal
            const diceNumber = parseInt(diceHex, 16);
            setDiceNumber(diceNumber);
        }
        const balance = await diceGameContract.balanceOf(currentAccount);
        setBalance(ethers.utils.formatEther(balance));
        const houseBalance = await diceGameContract.getHouseBalance();
        setHouseBalance(ethers.utils.formatEther(houseBalance));
    }

    const handleDeposit = async (currentAccount) => {
        const web3 = new ethers.providers.Web3Provider(window.ethereum);
        const diceGameAddress = DICE_ADDRESS_MAP[parseInt(prop.chainIdStr)];
        const diceGameContract = new ethers.Contract(diceGameAddress, diceGameAbi, web3);
        const bridgeTokenAddress = TOKEN_ADDRESS_MAP[parseInt(prop.chainIdStr)];
        const bridgeTokenContract = new ethers.Contract(bridgeTokenAddress, bridgeTokenAbi, web3);
        const wallet = web3.getSigner();
        const amountToSend = ethers.utils.parseEther(toDepositAmount);
        // approve the dice game contract to spend the token
        await bridgeTokenContract.
            connect(wallet).
            approve(diceGameAddress, amountToSend, { gasLimit: 1000000 }).
            catch((err) => {
                console.error("approve error", err);
            }
            );

        await diceGameContract
            .connect(wallet)
            .depositERC(amountToSend, { gasLimit: 1000000 })
            .catch((err) => {
                console.error("deposit error", err);
            });
        const balance = await diceGameContract.balanceOf(currentAccount);
        setBalance(ethers.utils.formatEther(balance));
    }

    return (
        <div className="dice-game">
            <h2>{isHouse? "Dice Game(Deposit on your house)":"Dice Game"}</h2>
            {
                !isHouse &&
                <label className="login">
                    <span>Name:</span>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                    <span>Age:</span>
                    <input type="text" value={age} onChange={(e) => setAge(e.target.value)} />
                    <button onClick={() => handleLogin(prop.currentAccount)}>Login</button>
                </label>
            }
            <p>Balance: {balance} Bet: {betAmount}</p>
            <p>House Balance: {houseBalance} House Address: {houseAddress}</p>
            <label>
                <span>Amount:</span>
                <input type="text" value={toDepositAmount} onChange={(e) => setToDepositAmount(e.target.value)} />
                <button onClick={() => handleDeposit(prop.currentAccount)}>Deposit</button>
            </label>
            {!isHouse &&
            <>
            <label>
                <span>Bet:</span>
                <input type="text" value={toBetAmount} onChange={(e) => setToBetAmount(e.target.value)} />
                <button onClick={() => handleBet(prop.currentAccount)}>Bet</button>
            </label>
            <label>
                <span>Dice:{diceNumber}</span>
                <button onClick={() => handleRoll(prop.currentAccount)}>Roll</button>
            </label>
            </>
            }
                {
                    diceNumber >= 4 && (<h2>You win!</h2>)
                }
                {
                    diceNumber < 4 && diceNumber > 0
                    && (<h2>You lose!</h2>)
                }

        </div>
    )
}

DiceGameForm.propTypes = {
    chainIdStr: PropTypes.string.isRequired,
    currentAccount: PropTypes.string.isRequired
}

const BridgeForm = (prop) => {
    const header = prop.isUZHETH ? "Transfer to SIDECHAIN" : "Transfer to UZHETH";
    const [amount, setAmount] = useState("0");
    const [recipient, setRecipient] = useState("");

    const handleTransfer = async (currentAccount) => {
        console.log("transfer");
        const web3 = new ethers.providers.Web3Provider(window.ethereum);
        const bridgeTokenAddress = TOKEN_ADDRESS_MAP[parseInt(prop.chainIdStr)];
        const bridgeTokenContract = new ethers.Contract(bridgeTokenAddress, bridgeTokenAbi, web3);
        const bridgePoolAddress = BRIDGE_ADDRESS_MAP[parseInt(prop.chainIdStr)];
        const bridgePoolContract = new ethers.Contract(bridgePoolAddress, bridgePoolAbi, web3);
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
                <span>Amount:</span>
                <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label>
                <span>Recipient:</span>
                <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
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



    // const handleListAccounts = async () => {
    //     const ats = await window.ethereum.request({
    //         "method": "eth_accounts",
    //         "params": []
    //     });
    //     console.log("accounts", ats);
    // }

    const handleFetchBalance = async () => {
        const web3 = new ethers.providers.Web3Provider(window.ethereum);
        const ethBalance = await web3.getBalance(currentAccount);
        setEthBalance(ethers.utils.formatEther(ethBalance));
        // get bridge token balance
        const bridgeTokenAddress = TOKEN_ADDRESS_MAP[parseInt(chainId)];
        const bridgeTokenContract = new ethers.Contract(bridgeTokenAddress, tokenAbi, web3);
        const bridgeTokenBalance = await bridgeTokenContract.balanceOf(currentAccount)
        setBridgeTokenBalance(ethers.utils.formatEther(bridgeTokenBalance));
    }


    return (
        <div className="bridge">
            {connected && (
                <div>
                    <>
                        <button onClick={handleFetchBalance}
                            disabled={!currentAccount}
                        >Refetch Balances</button>
                        <p></p>
                        {chainId && `Connected chain: ${getChainName(chainId)}`}
                        <p>Accounts in your wallet:(the 1st one is currently being used)</p>
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
                            <div className="form-div">
                                <BridgeForm
                                    chainIdStr={chainId}
                                    isUZHETH={parseInt(chainId) === UZHETHCHAIN_ID}
                                    currentAccount={currentAccount}
                                />
                                <DiceGameForm
                                    chainIdStr={chainId}
                                    currentAccount={currentAccount}
                                />
                            </div>
                        )
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
    // ask user to connect to metamask
    // once connected, show the bridge form
    window.ethereum.request({ method: "eth_requestAccounts" });
    return (
        <MetaMaskProvider
            sdkOptions={{
                dappMetadata: {
                    name: "Bridge",
                    url: window.location.href,
                },
            }}>
            <Bridge />
        </MetaMaskProvider>
    )
};

export default BridgePage;


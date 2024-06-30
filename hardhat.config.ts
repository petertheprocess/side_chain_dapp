import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      allowUnlimitedContractSize: true,
      url: "http://127.0.0.1:7545",
    },
    SIDE: {
      url: "http://127.0.0.1:7545",
      allowUnlimitedContractSize: true,
      //accounts: [privateKey1, privateKey2, ...]
    },
    UZHETH: {
      chainId: 702,
      url: "https://rpc.uzhethw.ifi.uzh.ch/",
      accounts: ["0xfa21b17fbef94e9d408290b39ed3c4b759a4fbd019d9cf3b23ee792c939f2246"],
      allowUnlimitedContractSize: true,
    },
  },
};

export default config;

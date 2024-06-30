// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BridgeToken is ERC20 {
    uint256 public constant MINT_AMOUNT_PER_USER = 10000;
    uint256 public constant MINT_AMOUNT_FOR_CONTRACT = 1000000;

    constructor(address[] memory holders) ERC20("BridgeToken", "BT") {
        // mint 10000 BT to each holder
        for (uint256 i = 0; i < holders.length; i++) {
            _mint(holders[i], MINT_AMOUNT_PER_USER * 10 ** decimals());
        }
        // mint another 1000000 BT to the contract itself
        _mint(address(this), MINT_AMOUNT_FOR_CONTRACT * 10 ** decimals());
        
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DiceBet {
    using SafeERC20 for IERC20;
    // Mapping is safer since you need an address to get the data,
    // and it should be private to prevent unwanted access.
    mapping(address => Player) private players;

    // Contract's address for internal transfers
    address private _wallet = address(this);

    // ERC20 token address and initial balance
    IERC20 private _token;

    // House struct to store contract's wallet and balances
    struct House {
        address wallet;
        uint256 balance;
        // IERC20 balance;
        address houseAddress;
    }
    House private house;

    // Time restriction to prevent DDos attacks
    uint256 private timeRestriction = block.timestamp + 2;

    // Event to log deposit made
    event LogDepositMade(address indexed accountAddress, uint256 amount);
    event LogWithdrawMade(address indexed accountAddress, uint256 amount);

    constructor(address t_tokenAddress) {
        _token = IERC20(t_tokenAddress);
        house = House({
            wallet: _wallet,
            balance: 0,
            houseAddress: msg.sender
        });
    }

    struct Player {
        uint256 bet;
        string name;
        uint256 balance;
        uint8 age;
        bool isLogged;
    }

    function isWin() private view returns (bool) {
        // Generate pseudo-random number based on block's properties and timeRestriction
        uint256 _rand = (uint256(
            keccak256(
                abi.encodePacked(blockhash(block.number - 1), block.timestamp)
            )
        ) % 6) + 1;
        return (_rand % 6) + 1 >= 4;
    }

    function login(string memory t_name, uint8 t_age) public {
        // Require player to be not logged in and not the house
        require(
            !players[msg.sender].isLogged && msg.sender != house.houseAddress,
            "already login or user is house"
        );
        // Require valid name length
        require(
            bytes(t_name).length <= 32 && bytes(t_name).length > 0,
            "name invalid"
        );

        players[msg.sender] = Player({
            bet: 0,
            balance: players[msg.sender].balance,
            age: t_age,
            name: t_name,
            isLogged: true
        });
    }

    function rollDice() public {
        // Require player to be logged in and not the house
        require(
            players[msg.sender].isLogged && msg.sender != house.houseAddress,
            "not a valid player"
        );
        // Require sufficient balance for the bet
        require(
            players[msg.sender].balance >= players[msg.sender].bet &&
                house.balance >= players[msg.sender].bet,
            "no sufficient balance for the bet"
        );
        // Require time restriction to be passed
        // require(timeRestriction <= block.timestamp, "time error");

        timeRestriction = block.timestamp + 2;

        if (isWin()) {
            players[msg.sender].balance += players[msg.sender].bet;
            house.balance -= players[msg.sender].bet;
        } else {
            players[msg.sender].balance -= players[msg.sender].bet;
            house.balance += players[msg.sender].bet;
        }
    }

    function putBet(uint256 t_betAsWei) public {
        // Require player to be logged in and not the house
        require(
            players[msg.sender].isLogged && msg.sender != house.houseAddress,
            "should be logged in player"
        );
        // Require bet to be within limits
        require(
            t_betAsWei <= 100000000000000000 && t_betAsWei > 0,
            "invalid amount"
        );
        // Require sufficient balance for the bet
        require(
            players[msg.sender].balance >= t_betAsWei &&
                house.balance >= t_betAsWei,
            "no sufficient balance"
        );

        players[msg.sender].bet = t_betAsWei;
    }

    function depositERC(uint256 t_amount) public {
        timeRestriction = block.timestamp + 2;
        // Transfer ERC20 token from player to the contract
        require(
            players[msg.sender].isLogged || msg.sender == house.houseAddress,
            "invalid caller, should be logged in player or house"
        );

        _token.safeTransferFrom(msg.sender, address(this), t_amount);

        emit LogDepositMade(msg.sender, t_amount);

        if (msg.sender == house.houseAddress) {
            house.balance += t_amount;
        } else {
            // Update player's balance
            players[msg.sender].balance += t_amount;
        }
    }

    function withdrawERC(uint256 t_wei) public {
        require(t_wei > 0);
        require(
            players[msg.sender].isLogged || msg.sender == house.houseAddress
        );

        if (msg.sender == house.houseAddress) {
            require(t_wei <= house.balance);
            house.balance -= t_wei;
            _token.safeTransfer(msg.sender, t_wei);
        } else {
            require(t_wei <= players[msg.sender].balance);
            players[msg.sender].balance -= t_wei;
            _token.safeTransfer(msg.sender, t_wei);
        }

        emit LogWithdrawMade(msg.sender, t_wei);
    }

    function getBalance() public view returns (uint256) {
        // Return balance based on caller (house or player)
        if (msg.sender == house.houseAddress) {
            return house.balance;
        } else {
            return players[msg.sender].balance;
        }
    }

    function getBet() public view returns (uint256) {
        return players[msg.sender].bet;
    }

    function getHouseAddress() public view returns (address) {
        return house.houseAddress;
    }

    function getHouseBalance() public view returns (uint256) {
        return house.balance;
    }

    function balanceOf(address t_address) public view returns (uint256) {
        if (t_address == house.houseAddress) {
            return house.balance;
        } else {
            return players[t_address].balance;
        }
    }
}

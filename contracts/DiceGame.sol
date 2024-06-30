// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
 
contract DiceBet {
    // Mapping is safer since you need an address to get the data,
    // and it should be private to prevent unwanted access.
    mapping(address => Player) private players;
 
    // Contract's address for internal transfers
    address nftAddress = address(this);
    address payable private _wallet = payable(nftAddress);
 
    // House struct to store contract's wallet and balances
    struct House {
        address payable wallet;
        uint256 balance;
        address payable houseAddress;
    }
    House private house;
 
    // Time restriction to prevent DDos attacks
    uint256 private timeRestriction = block.timestamp + 2;
 
    // Event to log deposit made
    event LogDepositMade(address indexed accountAddress, uint256 amount);
 
    constructor() {
        house = House({
            wallet: _wallet,
            balance: _wallet.balance,
            houseAddress: payable(msg.sender)
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
        uint256 _rand = uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp))) % 6 + 1;
        return _rand % 6 + 1 >= 4;
    }
 
    function login(string memory _name, uint8 _age) public {
        // Require player to be not logged in and not the house
        require(!players[msg.sender].isLogged && msg.sender != house.houseAddress, "already login");
        // Require valid name length
        require(bytes(_name).length <= 32 && bytes(_name).length > 0, "name invalid");
 
        players[msg.sender] = Player({
            bet: 0,
            balance: players[msg.sender].balance,
            age: _age,
            name: _name,
            isLogged: true
        });
    }
 
    function rollDice() public {
        // Require player to be logged in and not the house
        require(players[msg.sender].isLogged && msg.sender != house.houseAddress, "not a valid player");
        // Require sufficient balance for the bet
        require(
            players[msg.sender].balance >= players[msg.sender].bet &&
                house.balance >= players[msg.sender].bet, "no sufficient balance for the bet"
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
 
    function putBet(uint256 _betAsWei) public {
        // Require player to be logged in and not the house
        require(players[msg.sender].isLogged && msg.sender != house.houseAddress, "should be logged in player");
        // Require bet to be within limits
        require(_betAsWei <= 100000000000000000 && _betAsWei > 0, "invalid amount");
        // Require sufficient balance for the bet
        require(
            players[msg.sender].balance >= _betAsWei && house.balance >= _betAsWei
            ,"no sufficient balance"
        );
        // Require time restriction to be passed
        // require(timeRestriction <= block.timestamp);
 
        players[msg.sender].bet = _betAsWei;
    }
 
    function depositMoney() public payable {
        // Require time restriction to be passed
        // require(timeRestriction <= block.timestamp, "time err");
        // timeRestriction = block.timestamp + 2;
        // Require non-zero value for deposit
        require(msg.value > 0, "amount should > 0");
        // Allow both players and the house to deposit money
        require(players[msg.sender].isLogged || msg.sender == house.houseAddress, "invalid caller");
 
        emit LogDepositMade(msg.sender, msg.value);
 
        if (msg.sender == house.houseAddress) {
            house.balance += msg.value;
        } else {
            players[msg.sender].balance += msg.value;
        }
    }

    function withdrawMoney(uint256 _wei) public payable {
        require(_wei > 0);
        require(players[msg.sender].isLogged || msg.sender == house.houseAddress);

        if (msg.sender == house.houseAddress) {
            require(_wei <= house.balance);
            house.balance -= _wei;
            payable(msg.sender).transfer(_wei);
        } else {
            require(_wei <= players[msg.sender].balance);
            players[msg.sender].balance -= _wei;
            payable(msg.sender).transfer(_wei);
        }
    }

 
    function getBalance() public view returns (uint256) {
        // Return balance based on caller (house or player)
        if (msg.sender == house.houseAddress) {
            return house.balance;
        } else {
            return players[msg.sender].balance;
        }
    }
}
 

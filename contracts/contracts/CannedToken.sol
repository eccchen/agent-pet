// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CannedToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public isMinter;
    mapping(address => bool) public isTransferCounterparty;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MinterSet(address indexed account, bool allowed);
    event TransferCounterpartySet(address indexed account, bool allowed);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyMinter() {
        require(isMinter[msg.sender], "Not minter");
        _;
    }

    constructor(string memory tokenName, string memory tokenSymbol) {
        require(bytes(tokenName).length > 0, "Name required");
        require(bytes(tokenSymbol).length > 0, "Symbol required");

        owner = msg.sender;
        name = tokenName;
        symbol = tokenSymbol;

        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Owner required");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setMinter(address account, bool allowed) external onlyOwner {
        require(account != address(0), "Account required");
        isMinter[account] = allowed;
        emit MinterSet(account, allowed);
    }

    function setTransferCounterparty(address account, bool allowed) external onlyOwner {
        require(account != address(0), "Account required");
        isTransferCounterparty[account] = allowed;
        emit TransferCounterpartySet(account, allowed);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "Spender required");
        require(amount == 0 || isTransferCounterparty[spender], "Spender not allowed");

        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(from != address(0), "From required");

        if (msg.sender != from) {
            uint256 currentAllowance = allowance[from][msg.sender];
            require(currentAllowance >= amount, "Allowance exceeded");
            if (currentAllowance != type(uint256).max) {
                allowance[from][msg.sender] = currentAllowance - amount;
                emit Approval(from, msg.sender, allowance[from][msg.sender]);
            }
        }

        _transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "Recipient required");
        require(amount > 0, "Amount required");

        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0), "Recipient required");
        require(amount > 0, "Amount required");
        require(
            isTransferCounterparty[from] || isTransferCounterparty[to],
            "Transfer not allowed"
        );

        uint256 fromBalance = balanceOf[from];
        require(fromBalance >= amount, "Balance exceeded");

        balanceOf[from] = fromBalance - amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
    }
}

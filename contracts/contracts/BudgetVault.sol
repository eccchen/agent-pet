// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPetRegistry {
    function ownerOf(uint256 petId) external view returns (address);
}

contract BudgetVault {
    struct Budget {
        uint256 deposited;
        uint256 spendableBudget;
        uint256 singleTxLimit;
        uint256 dailyLimit;
    }

    IPetRegistry public immutable registry;

    mapping(uint256 => Budget) private _budgets;

    event PetDeposited(uint256 indexed petId, address indexed owner, uint256 amount);
    event BudgetSet(
        uint256 indexed petId,
        uint256 spendableBudget,
        uint256 singleTxLimit,
        uint256 dailyLimit
    );
    event UnusedFundsWithdrawn(uint256 indexed petId, address indexed owner, uint256 amount);

    constructor(address registryAddress) {
        require(registryAddress != address(0), "Registry required");
        registry = IPetRegistry(registryAddress);
    }

    function depositForPet(uint256 petId) external payable {
        require(msg.value > 0, "No deposit");
        _requirePetOwner(petId);

        _budgets[petId].deposited += msg.value;
        emit PetDeposited(petId, msg.sender, msg.value);
    }

    function setBudget(
        uint256 petId,
        uint256 spendableBudget,
        uint256 singleTxLimit,
        uint256 dailyLimit
    ) external {
        _requirePetOwner(petId);

        Budget storage budget = _budgets[petId];
        require(spendableBudget <= budget.deposited, "Budget exceeds deposit");

        budget.spendableBudget = spendableBudget;
        budget.singleTxLimit = singleTxLimit;
        budget.dailyLimit = dailyLimit;

        emit BudgetSet(petId, spendableBudget, singleTxLimit, dailyLimit);
    }

    function withdrawUnused(uint256 petId, uint256 amount) external {
        _requirePetOwner(petId);
        require(amount > 0, "No withdrawal");

        Budget storage budget = _budgets[petId];
        require(budget.deposited >= budget.spendableBudget + amount, "Exceeds unused funds");

        budget.deposited -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit UnusedFundsWithdrawn(petId, msg.sender, amount);
    }

    function petBudget(uint256 petId)
        external
        view
        returns (
            uint256 deposited,
            uint256 spendableBudget,
            uint256 singleTxLimit,
            uint256 dailyLimit
        )
    {
        Budget storage budget = _budgets[petId];
        return (
            budget.deposited,
            budget.spendableBudget,
            budget.singleTxLimit,
            budget.dailyLimit
        );
    }

    function _requirePetOwner(uint256 petId) private view {
        require(registry.ownerOf(petId) == msg.sender, "Not pet owner");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PetRegistry {
    struct Pet {
        address owner;
        string name;
        bool exists;
    }

    mapping(address => bool) private _registeredPlayers;
    mapping(uint256 => Pet) private _pets;
    uint256 private _nextPetId = 1;

    event PlayerRegistered(address indexed player);
    event PetCreated(uint256 indexed petId, address indexed owner, string name);

    function registerPlayer() external {
        _registeredPlayers[msg.sender] = true;
        emit PlayerRegistered(msg.sender);
    }

    function isPlayerRegistered(address player) external view returns (bool) {
        return _registeredPlayers[player];
    }

    function createPet(string calldata name) external returns (uint256 petId) {
        require(_registeredPlayers[msg.sender], "Player not registered");

        petId = _nextPetId;
        _nextPetId += 1;

        _pets[petId] = Pet({owner: msg.sender, name: name, exists: true});

        emit PetCreated(petId, msg.sender, name);
    }

    function ownerOf(uint256 petId) external view returns (address) {
        Pet storage pet = _pets[petId];
        require(pet.exists, "Unknown pet");
        return pet.owner;
    }

    function petOf(uint256 petId) external view returns (address owner, string memory name) {
        Pet storage pet = _pets[petId];
        require(pet.exists, "Unknown pet");
        return (pet.owner, pet.name);
    }
}

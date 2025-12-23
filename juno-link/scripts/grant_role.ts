/// <reference types="@nomicfoundation/hardhat-toolbox" />
import hre from "hardhat";

const { ethers } = hre as any; // Cast as any to satisfy IDE if augmentation is failing

async function main() {
    const TARGET_ADDRESS = process.env.TARGET_ADDRESS; // User's Web3Auth Address
    if (!TARGET_ADDRESS) throw new Error("TARGET_ADDRESS not set in .env");

    // 1. Get Deployer (Admin)
    const [deployer] = await ethers.getSigners();
    if (!deployer) throw new Error("No deployer account found.");

    console.log("Granting role with admin account:", deployer.address);

    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) throw new Error("CONTRACT_ADDRESS not set in .env");
    const JunoCrewSBT = await ethers.getContractFactory("JunoCrewSBT");
    const contract = JunoCrewSBT.attach(contractAddress) as any;

    const MINTER_ROLE = await contract.MINTER_ROLE();

    // 2. Grant Role
    console.log(`Granting MINTER_ROLE to ${TARGET_ADDRESS}...`);
    // Explicitly set gas limit to avoid estimation errors if network is funky
    const tx = await contract.grantRole(MINTER_ROLE, TARGET_ADDRESS);
    console.log(`Transaction sent: ${tx.hash}`);
    console.log("Waiting for confirmation...");

    await tx.wait(1); // Wait for 1 confirmation
    console.log("Role granted successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

/// <reference types="@nomicfoundation/hardhat-toolbox" />
import hre from "hardhat";

const { ethers } = hre as any;

async function main() {
    // 1. Get the Deployer Account (has MINTER_ROLE)
    const [deployer] = await ethers.getSigners();
    if (!deployer) {
        throw new Error("No deployer account found. Check .env PRIVATE_KEY");
    }
    console.log("Minting with account:", deployer.address);

    // 2. Configuration
    // Address to mint TO (Pass as command line arg or hardcode)
    const recipient = process.env.MINT_TO_ADDRESS;
    if (!recipient) {
        throw new Error("Please set MINT_TO_ADDRESS environment variable or hardcode it in the script.");
    }

    const contractAddress = process.env.CONTRACT_ADDRESS; // Deployed JunoCrewSBT Address
    if (!contractAddress) throw new Error("CONTRACT_ADDRESS not set in .env");
    const TOKEN_ID_DECKHAND = 1; // 1 = Deckhand, 2 = Skipper
    const AMOUNT = 1;

    // 3. Connect to Contract
    const JunoCrewSBT = await ethers.getContractFactory("JunoCrewSBT");
    const contract = JunoCrewSBT.attach(contractAddress) as any;

    // 4. Mint
    console.log(`Minting Token ID ${TOKEN_ID_DECKHAND} (Deckhand) to ${recipient}...`);
    const tx = await contract.mint(recipient, TOKEN_ID_DECKHAND, AMOUNT, "0x");

    console.log("Transaction sent:", tx.hash);
    await tx.wait();

    console.log("Mint confirmed!");
    console.log(`User ${recipient} is now a DECKHAND!`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

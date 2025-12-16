import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const metadataURI = "https://juno-link.vercel.app/api/metadata/"; // Placeholder URI
    const adminAddress = deployer.address;

    const JunoCrewSBT = await ethers.getContractFactory("JunoCrewSBT");
    const sbt = await JunoCrewSBT.deploy(metadataURI, adminAddress);

    await sbt.waitForDeployment();

    console.log("JunoCrewSBT deployed to:", await sbt.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

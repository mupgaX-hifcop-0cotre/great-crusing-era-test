import hre from "hardhat";
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    if (!deployer) {
        throw new Error("No deployer account found. Make sure PRIVATE_KEY is set in .env");
    }

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

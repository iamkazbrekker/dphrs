import { execSync } from "child_process";

async function main() {
    try {
        console.log("Starting deployment with Hardhat Ignition...");
        // Run the ignition deploy command
        execSync("npx hardhat ignition deploy ignition/modules/Patientregistry.ts --network localhost --reset", { stdio: "inherit" });

        console.log("\nDeployment successful! Exporting configuration...");
        // Run the export-config script
        execSync("npx hardhat run scripts/export-config.ts --network localhost", { stdio: "inherit" });

        console.log("\nAll done! Contracts deployed and frontend updated.");
    } catch (error) {
        console.error("\nDeployment or configuration export failed:");
        console.error(error);
        process.exit(1);
    }
}

main();

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Ignition deployment output
const deploymentDir = path.resolve(
  __dirname,
  "../ignition/deployments/chain-31337"
);

// Read the deployed addresses
const deployedAddresses = JSON.parse(
  fs.readFileSync(path.join(deploymentDir, "deployed_addresses.json"), "utf-8")
);

// The key format is "ModuleName#ContractName"
const address =
  deployedAddresses["PatientRegistryModule#PatientsRegistry"];

// Read the ABI from the Hardhat artifact
const artifact = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      "../artifacts/contracts/PatientRegistry.sol/PatientsRegistry.json"
    ),
    "utf-8"
  )
);

const config = {
  address,
  abi: artifact.abi,
  network: "localhost",
  chainId: 31337,
};

// Write to the Next.js project
const outputPath = path.resolve(
  __dirname,
  "../../frontend/src/lib/contract-config.json"
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
console.log("contract-config.json written to:", outputPath);
console.log("Contract address:", address);

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PatientRegistryModule", (m) => {
    const registry = m.contract("PatientsRegistry");

    return { registry };
});

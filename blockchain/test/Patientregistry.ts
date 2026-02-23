import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("PatientsRegistry", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("Should register a new patient", async function () {
    const registry = await viem.deployContract("PatientsRegistry");
    const [walletClient] = await viem.getWalletClients();

    // Register a patient
    const dob = BigInt(Math.floor(new Date("1990-01-15").getTime() / 1000));
    await registry.write.register(["Alice Smith", dob, "A+", "Female"], {
      account: walletClient.account,
    });

    // Check registration
    const isReg = await registry.read.isRegistered({
      account: walletClient.account,
    });
    assert.equal(isReg, true);
  });

  it("Should emit PatientRegistered event", async function () {
    const registry = await viem.deployContract("PatientsRegistry");
    const [walletClient] = await viem.getWalletClients();

    const dob = BigInt(Math.floor(new Date("1990-01-15").getTime() / 1000));

    const hash = await registry.write.register(["Bob Jones", dob, "O-", "Male"], {
      account: walletClient.account,
    });

    // Verify event was emitted by checking transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    assert.equal(receipt.status, "success");

    const events = await publicClient.getContractEvents({
      address: registry.address,
      abi: registry.abi,
      eventName: "PatientRegistered",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].args.name, "Bob Jones");
  });

  it("Should add and retrieve a medical record", async function () {
    const registry = await viem.deployContract("PatientsRegistry");
    const [walletClient] = await viem.getWalletClients();

    // Register first
    const dob = BigInt(Math.floor(new Date("1990-01-15").getTime() / 1000));
    await registry.write.register(["Alice Smith", dob, "A+", "Female"], {
      account: walletClient.account,
    });

    // Add a record
    await registry.write.addMedicalRecord(
      ["Diagnosis", "Mild hypertension", "Dr. Smith", "City Hospital"],
      { account: walletClient.account }
    );

    // Retrieve the record count
    const count = await registry.read.getRecordCount({
      account: walletClient.account,
    });
    assert.equal(count, 1n);

    // Retrieve the record
    const record = await registry.read.getMedicalRecord([0n], {
      account: walletClient.account,
    });
    assert.equal(record[1], "Diagnosis");
    assert.equal(record[2], "Mild hypertension");
  });

  it("Should prevent duplicate registration", async function () {
    const registry = await viem.deployContract("PatientsRegistry");
    const [walletClient] = await viem.getWalletClients();

    const dob = BigInt(Math.floor(new Date("1990-01-15").getTime() / 1000));
    await registry.write.register(["Alice Smith", dob, "A+", "Female"], {
      account: walletClient.account,
    });

    // Try to register again — should revert
    await assert.rejects(
      async () =>
        registry.write.register(["Alice Smith", dob, "A+", "Female"], {
          account: walletClient.account,
        }),
      /Already registered/
    );
  });

  it("Should prevent unregistered users from adding records", async function () {
    const registry = await viem.deployContract("PatientsRegistry");
    const [walletClient] = await viem.getWalletClients();

    await assert.rejects(
      async () =>
        registry.write.addMedicalRecord(
          ["Diagnosis", "Test", "Dr. Test", "Test Hospital"],
          { account: walletClient.account }
        ),
      /Not registered/
    );
  });
});

"use client";
import { useState } from "react";
import { getContractInstance } from "@/lib/contract";

const recordTypes = ["Diagnosis", "Lab Result", "Prescription", "Vaccination", "Surgery", "Imaging", "Allergy", "Other"];

export default function AddRecord({ onAdded }) {
    const [form, setForm] = useState({
        recordType: "Diagnosis",
        description: "",
        doctorName: "",
        institution: ""
    });
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setStatus("");
        try {
            const { contract, publicClient, address } = await getContractInstance();
            const hash = await contract.write.addMedicalRecord([
                form.recordType,
                form.description,
                form.doctorName,
                form.institution,
            ], { account: address });
            setStatus("Submitting transaction…");
            await publicClient.waitForTransactionReceipt({ hash });
            setStatus("Record saved to blockchain ✓");
            setForm({ recordType: "Diagnosis", description: "", doctorName: "", institution: "" });
            if (onAdded) onAdded();
        } catch (err) {
            setStatus("Error: " + (err.shortMessage || err.message));
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} style={styles.form}>
            <h3 style={styles.h3}>➕ Add Medical Record</h3>
            <select style={styles.input} value={form.recordType}
                onChange={e => setForm({ ...form, recordType: e.target.value })}>
                {recordTypes.map(t => <option key={t}>{t}</option>)}
            </select>
            <textarea style={{ ...styles.input, height: "80px" }}
                placeholder="Description *"
                required
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
            />
            <input style={styles.input} placeholder="Doctor Name"
                value={form.doctorName}
                onChange={e => setForm({ ...form, doctorName: e.target.value })} />
            <input style={styles.input} placeholder="Hospital / Clinic"
                value={form.institution}
                onChange={e => setForm({ ...form, institution: e.target.value })} />
            <button style={styles.btn} type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save Record"}
            </button>
            {status && <p style={styles.status}>{status}</p>}
        </form>
    );
}

const styles = {
    form: { display: "flex", flexDirection: "column", gap: "1rem", background: "#ffffff", padding: "1.8rem", borderRadius: "1.8rem", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
    h3: { margin: 0, color: "#13544a", fontSize: "1.2rem", fontWeight: 600 },
    input: { padding: "0.8rem 1rem", borderRadius: "1rem", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1e293b", fontSize: "0.95rem", resize: "vertical", outline: "none" },
    btn: { padding: "0.8rem", background: "#13544a", color: "#fff", border: "none", borderRadius: "2rem", cursor: "pointer", fontWeight: 600, boxShadow: "0 4px 12px rgba(19,84,74,0.15)" },
    status: { fontSize: "0.85rem", color: "#13544a", background: "#f8fafc", padding: "0.6rem 1rem", borderRadius: "0.8rem", border: "1px solid #e2e8f0" }
};

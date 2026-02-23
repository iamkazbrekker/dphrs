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
    form: { display: "flex", flexDirection: "column", gap: "0.75rem", background: "#1e293b", padding: "1.5rem", borderRadius: "0.75rem" },
    h3: { margin: 0, color: "#f1f5f9", fontSize: "1.05rem" },
    input: { padding: "0.65rem 0.9rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.9rem", resize: "vertical" },
    btn: { padding: "0.65rem", background: "#10b981", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 600 },
    status: { fontSize: "0.8rem", color: "#fbbf24" }
};

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContractInstance, getCurrentAddress } from "@/lib/contract";

const recordTypes = ["Diagnosis", "Lab Result", "Prescription", "Vaccination", "Surgery", "Imaging", "Allergy", "Other"];

export default function HospitalDashboard() {
    const router = useRouter();
    const [address, setAddress] = useState("");
    const [instName, setInstName] = useState("");
    const [patientKey, setPatientKey] = useState("");
    const [patient, setPatient] = useState(null);   // { name, dob, bloodType, gender, count }
    const [records, setRecords] = useState([]);
    const [addForm, setAddForm] = useState({ recordType: "Diagnosis", description: "", doctorName: "" });
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState("lookup"); // lookup | add

    useEffect(() => {
        (async () => {
            try {
                const addr = await getCurrentAddress();
                setAddress(addr);
                const { contract, address: a } = await getContractInstance();
                const ok = await contract.read.isInstitutionRegistered({ account: a });
                if (!ok) { router.push("/"); return; }
                const name = await contract.read.getInstitutionName({ account: a });
                setInstName(name);
            } catch { router.push("/"); }
        })();
        if (window.ethereum)
            window.ethereum.on("accountsChanged", () => window.location.reload());
    }, []);

    async function handleLookup(e) {
        e.preventDefault();
        if (!patientKey.trim()) return;
        setLoading(true); setStatus(""); setPatient(null); setRecords([]);
        try {
            const { contract, publicClient, address: a } = await getContractInstance();
            // getPatientBasicInfo writes an access log — it's a write tx
            const hash = await contract.write.getPatientBasicInfo([patientKey], { account: a });
            setStatus("Fetching patient data…");
            await publicClient.waitForTransactionReceipt({ hash });

            // After the tx confirms, read patient records (read-only, no extra log)
            const { contract: c2 } = await getContractInstance();
            // Re-read basic info via a read workaround: read count then each record
            // (We re-call getPatientBasicInfo as a simulation to get return values)
            const result = await publicClient.simulateContract({
                address: (await import("@/lib/contract-config.json")).default.address,
                abi: (await import("@/lib/contract-config.json")).default.abi,
                functionName: "getPatientBasicInfo",
                args: [patientKey],
                account: a,
            });
            const [name, dob, bloodType, gender, count] = result.result;
            setPatient({
                name, bloodType, gender,
                dob: new Date(Number(dob) * 1000).toLocaleDateString(),
                count: Number(count),
            });
            // Fetch records
            const recs = [];
            for (let i = 0; i < Number(count); i++) {
                const [ts, recordType, description, doctorName, institution, addedBy] =
                    await c2.read.getPatientRecord([patientKey, BigInt(i)], { account: a });
                recs.push({ ts: new Date(Number(ts) * 1000).toLocaleString(), recordType, description, doctorName, institution, addedBy });
            }
            setRecords(recs.reverse());
            setStatus("");
        } catch (err) {
            setStatus("Error: " + (err.shortMessage || err.message));
        } finally { setLoading(false); }
    }

    async function handleAddRecord(e) {
        e.preventDefault();
        setLoading(true); setStatus("");
        try {
            const { contract, publicClient, address: a } = await getContractInstance();
            const hash = await contract.write.addRecordForPatient(
                [patientKey, addForm.recordType, addForm.description, addForm.doctorName],
                { account: a }
            );
            setStatus("Saving record to blockchain…");
            await publicClient.waitForTransactionReceipt({ hash });
            setStatus("Record added ✓");
            setAddForm({ recordType: "Diagnosis", description: "", doctorName: "" });
            setTab("lookup");
        } catch (err) {
            setStatus("Error: " + (err.shortMessage || err.message));
        } finally { setLoading(false); }
    }

    const ZERO = "0x0000000000000000000000000000000000000000";

    return (
        <main style={S.page}>
            <div style={S.topbar}>
                <span style={S.logo}>🏥 DPHRS — {instName || "Hospital"}</span>
                <span style={S.addr}>{address ? address.slice(0, 6) + "…" + address.slice(-4) : ""}</span>
                <button style={S.signout} onClick={() => { sessionStorage.setItem("disconnected", "true"); router.push("/"); }}>
                    Sign Out
                </button>
            </div>

            <div style={S.content}>
                {/* Patient lookup form */}
                <div style={S.lookupCard}>
                    <h2 style={S.h2}>🔎 Look Up Patient</h2>
                    <form onSubmit={handleLookup} style={S.lookupRow}>
                        <input style={S.input} placeholder="Patient Wallet Address (0x…)" required
                            value={patientKey} onChange={e => setPatientKey(e.target.value)} />
                        <button style={S.btn} type="submit" disabled={loading}>
                            {loading ? "…" : "Fetch"}
                        </button>
                    </form>
                    {status && <p style={S.status}>{status}</p>}
                </div>

                {/* Patient profile */}
                {patient && (
                    <>
                        <div style={S.profileCard}>
                            <h3 style={S.h3}>👤 {patient.name}</h3>
                            <div style={S.row}>
                                <span style={S.badge}>🩸 {patient.bloodType}</span>
                                <span style={S.meta}>DOB: {patient.dob}</span>
                                <span style={S.meta}>{patient.gender}</span>
                                <span style={S.meta}>{patient.count} record{patient.count !== 1 ? "s" : ""}</span>
                            </div>
                        </div>

                        <div style={S.tabs}>
                            <button style={tab === "lookup" ? S.tabActive : S.tab} onClick={() => setTab("lookup")}>
                                📋 View Records
                            </button>
                            <button style={tab === "add" ? S.tabActive : S.tab} onClick={() => setTab("add")}>
                                ➕ Add Record
                            </button>
                        </div>

                        {tab === "lookup" && (
                            <>
                                <h3 style={S.h3}>📋 Medical History</h3>
                                {records.length === 0 && <p style={{ color: "#64748b" }}>No records yet.</p>}
                                {records.map((r, i) => (
                                    <div key={i} style={S.record}>
                                        <div style={S.recHeader}>
                                            <span style={S.tag}>{r.recordType}</span>
                                            {r.addedBy !== ZERO && <span style={S.instTag}>🏥 By institution</span>}
                                            <span style={S.tiny}>{r.ts}</span>
                                        </div>
                                        <p style={S.desc}>{r.description}</p>
                                        {r.doctorName && <p style={S.meta}>👨‍⚕️ {r.doctorName}</p>}
                                        {r.institution && <p style={S.meta}>🏥 {r.institution}</p>}
                                    </div>
                                ))}
                            </>
                        )}

                        {tab === "add" && (
                            <form onSubmit={handleAddRecord} style={S.addForm}>
                                <h3 style={S.h3}>➕ Add Record for {patient.name}</h3>
                                <select style={S.input} value={addForm.recordType}
                                    onChange={e => setAddForm({ ...addForm, recordType: e.target.value })}>
                                    {recordTypes.map(t => <option key={t}>{t}</option>)}
                                </select>
                                <textarea style={{ ...S.input, height: "80px", resize: "vertical" }}
                                    placeholder="Description *" required
                                    value={addForm.description}
                                    onChange={e => setAddForm({ ...addForm, description: e.target.value })} />
                                <input style={S.input} placeholder="Doctor Name"
                                    value={addForm.doctorName}
                                    onChange={e => setAddForm({ ...addForm, doctorName: e.target.value })} />
                                <button style={{ ...S.btn, background: "#10b981" }} type="submit" disabled={loading}>
                                    {loading ? "Saving…" : "Save Record to Blockchain"}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}

const S = {
    page: { minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" },
    topbar: { display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 2rem", background: "#0d9488", borderBottom: "1px solid #0f766e" },
    logo: { fontWeight: 700, fontSize: "1.2rem", flex: 1 },
    addr: { fontFamily: "monospace", fontSize: "0.85rem", color: "#ccfbf1" },
    signout: { padding: "0.4rem 0.9rem", background: "transparent", border: "1px solid #5eead4", color: "#ccfbf1", borderRadius: "0.4rem", cursor: "pointer", fontSize: "0.85rem" },
    content: { maxWidth: "720px", margin: "2rem auto", padding: "0 1rem" },
    lookupCard: { background: "#1e293b", padding: "1.5rem", borderRadius: "0.75rem", marginBottom: "1.5rem" },
    h2: { margin: "0 0 1rem", fontSize: "1.1rem", color: "#f1f5f9" },
    h3: { margin: "0 0 0.5rem", color: "#f1f5f9", fontSize: "1.05rem" },
    lookupRow: { display: "flex", gap: "0.75rem" },
    input: { flex: 1, padding: "0.65rem 0.9rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.9rem" },
    btn: { padding: "0.65rem 1.25rem", background: "#0d9488", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" },
    status: { marginTop: "0.75rem", fontSize: "0.82rem", color: "#fbbf24" },
    profileCard: { background: "#1e293b", padding: "1.25rem 1.5rem", borderRadius: "0.75rem", marginBottom: "1rem" },
    row: { display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" },
    badge: { background: "#dc2626", color: "#fff", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 },
    meta: { color: "#94a3b8", fontSize: "0.85rem" },
    tabs: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
    tab: { flex: 1, padding: "0.6rem", background: "#1e293b", border: "none", color: "#94a3b8", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.9rem" },
    tabActive: { flex: 1, padding: "0.6rem", background: "#0d9488", border: "none", color: "#fff", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600 },
    record: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: "0.6rem", padding: "1rem 1.25rem", marginBottom: "0.75rem" },
    recHeader: { display: "flex", gap: "0.5rem", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" },
    tag: { background: "#1d4ed8", color: "#fff", padding: "0.15rem 0.5rem", borderRadius: "0.3rem", fontSize: "0.75rem", fontWeight: 600 },
    instTag: { background: "#0d9488", color: "#fff", padding: "0.15rem 0.5rem", borderRadius: "0.3rem", fontSize: "0.72rem" },
    desc: { color: "#e2e8f0", margin: "0.25rem 0", fontSize: "0.9rem" },
    tiny: { color: "#475569", fontSize: "0.75rem" },
    addForm: { background: "#1e293b", padding: "1.5rem", borderRadius: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" },
};

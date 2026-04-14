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
    page: { minHeight: "100vh", background: "#dee6e5", color: "#1e293b", fontFamily: "'Inter', sans-serif" },
    topbar: { display: "flex", alignItems: "center", gap: "1rem", padding: "1.2rem 2.5rem", background: "transparent" },
    logo: { fontWeight: 700, fontSize: "1.3rem", color: "#13544a", flex: 1 },
    addr: { fontFamily: "monospace", fontSize: "0.85rem", color: "#475569", background: "#ffffff", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: "1px solid #e2e8f0" },
    signout: { padding: "0.5rem 1rem", background: "#ffffff", border: "none", color: "#1e293b", borderRadius: "2rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
    content: { maxWidth: "780px", margin: "1rem auto 3rem", padding: "0 1.5rem" },
    lookupCard: { background: "#ffffff", padding: "1.8rem", borderRadius: "1.8rem", marginBottom: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
    h2: { margin: "0 0 1rem", fontSize: "1.2rem", color: "#13544a", fontWeight: 600 },
    h3: { margin: "0 0 0.8rem", color: "#1e293b", fontSize: "1.1rem", fontWeight: 600 },
    lookupRow: { display: "flex", gap: "1rem" },
    input: { flex: 1, padding: "0.8rem 1rem", borderRadius: "1rem", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1e293b", fontSize: "0.95rem", outline: "none" },
    btn: { padding: "0.8rem 1.5rem", background: "#13544a", color: "#fff", border: "none", borderRadius: "2rem", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(19,84,74,0.15)" },
    status: { marginTop: "1rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "0.8rem", fontSize: "0.85rem", color: "#13544a", border: "1px solid #e2e8f0" },
    profileCard: { background: "#ffffff", padding: "1.5rem 1.8rem", borderRadius: "1.8rem", marginBottom: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
    row: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.5rem" },
    badge: { background: "#badd93", color: "#13544a", padding: "0.3rem 0.8rem", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 600 },
    meta: { color: "#64748b", fontSize: "0.9rem", fontWeight: 500 },
    tabs: { display: "flex", gap: "0.8rem", marginBottom: "1.5rem" },
    tab: { flex: 1, padding: "0.8rem", background: "#ffffff", border: "none", color: "#64748b", borderRadius: "1.5rem", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" },
    tabActive: { flex: 1, padding: "0.8rem", background: "#badd93", border: "none", color: "#13544a", borderRadius: "1.5rem", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, boxShadow: "0 4px 15px rgba(186,221,147,0.2)" },
    record: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1.2rem", padding: "1.2rem 1.5rem", marginBottom: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.01)" },
    recHeader: { display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap" },
    tag: { background: "#13544a", color: "#fff", padding: "0.25rem 0.8rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 600 },
    instTag: { background: "#256a5c", color: "#fff", padding: "0.25rem 0.8rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 500 },
    desc: { color: "#334155", margin: "0.5rem 0", fontSize: "0.95rem", lineHeight: 1.5 },
    tiny: { color: "#64748b", fontSize: "0.8rem", fontWeight: 500 },
    addForm: { background: "#ffffff", padding: "1.8rem", borderRadius: "1.8rem", display: "flex", flexDirection: "column", gap: "1rem", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
};

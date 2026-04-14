"use client";
import { useState, useEffect } from "react";
import { getContractInstance } from "@/lib/contract";

export default function ViewRecords({ refresh }) {
    const [profile, setProfile] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchAll(); }, [refresh]);

    async function fetchAll() {
        setLoading(true);
        try {
            const { contract, address } = await getContractInstance();
            const [name, dob, bloodType, gender, count] =
                await contract.read.getMyProfile({ account: address });
            setProfile({
                name, bloodType, gender,
                dob: new Date(Number(dob) * 1000).toLocaleDateString(),
                count: Number(count),
            });
            const recs = [];
            for (let i = 0; i < Number(count); i++) {
                const [ts, recordType, description, doctorName, institution, addedBy] =
                    await contract.read.getMedicalRecord([BigInt(i)], { account: address });
                recs.push({
                    ts: new Date(Number(ts) * 1000).toLocaleString(),
                    recordType, description, doctorName, institution,
                    byInstitution: addedBy !== "0x0000000000000000000000000000000000000000",
                    adderAddr: addedBy,
                });
            }
            setRecords(recs.reverse());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    if (loading) return <p style={{ color: "#94a3b8" }}>Loading…</p>;
    if (!profile) return <p style={{ color: "#f87171" }}>Could not load profile.</p>;

    return (
        <div>
            <div style={S.profileCard}>
                <h3 style={S.h3}>👤 {profile.name}</h3>
                <div style={S.row}>
                    <span style={S.badge}>🩸 {profile.bloodType}</span>
                    <span style={S.meta}>DOB: {profile.dob}</span>
                    <span style={S.meta}>{profile.gender}</span>
                    <span style={S.meta}>{profile.count} record{profile.count !== 1 ? "s" : ""}</span>
                </div>
            </div>

            <h3 style={{ ...S.h3, marginTop: "1.5rem" }}>📋 Medical History</h3>
            {records.length === 0 && <p style={{ color: "#64748b" }}>No records yet.</p>}
            {records.map((r, i) => (
                <div key={i} style={S.record}>
                    <div style={S.recHeader}>
                        <span style={S.tag}>{r.recordType}</span>
                        {r.byInstitution && <span style={S.instTag}>🏥 Added by institution</span>}
                        <span style={S.tiny}>{r.ts}</span>
                    </div>
                    <p style={S.desc}>{r.description}</p>
                    {r.doctorName && <p style={S.meta}>👨‍⚕️ {r.doctorName}</p>}
                    {r.institution && <p style={S.meta}>🏥 {r.institution}</p>}
                </div>
            ))}
        </div>
    );
}

const S = {
    profileCard: { background: "#ffffff", padding: "1.5rem 1.8rem", borderRadius: "1.8rem", marginBottom: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
    h3: { margin: "0 0 0.8rem", color: "#1e293b", fontSize: "1.1rem", fontWeight: 600 },
    row: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.5rem" },
    badge: { background: "#badd93", color: "#13544a", padding: "0.3rem 0.8rem", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 600 },
    meta: { color: "#64748b", fontSize: "0.9rem", fontWeight: 500 },
    tiny: { color: "#64748b", fontSize: "0.8rem", fontWeight: 500 },
    record: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "1.2rem", padding: "1.2rem 1.5rem", marginBottom: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.01)" },
    recHeader: { display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem", flexWrap: "wrap" },
    tag: { background: "#13544a", color: "#fff", padding: "0.25rem 0.8rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 600 },
    instTag: { background: "#256a5c", color: "#fff", padding: "0.25rem 0.8rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 500 },
    desc: { color: "#334155", margin: "0.5rem 0", fontSize: "0.95rem", lineHeight: 1.5 },
};

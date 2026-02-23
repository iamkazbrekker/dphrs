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
            // Profile
            const [name, dob, bloodType, gender, count] = await contract.read.getMyProfile({ account: address });
            setProfile({
                name,
                dob: new Date(Number(dob) * 1000).toLocaleDateString(),
                bloodType,
                gender,
                count: Number(count),
            });

            // Records
            const recs = [];
            for (let i = 0; i < Number(count); i++) {
                const [ts, recordType, description, doctorName, institution] =
                    await contract.read.getMedicalRecord([BigInt(i)], { account: address });
                recs.push({
                    ts: new Date(Number(ts) * 1000).toLocaleString(),
                    recordType,
                    description,
                    doctorName,
                    institution,
                });
            }
            setRecords(recs.reverse()); // newest first
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <p style={{ color: "#94a3b8" }}>Loading records…</p>;
    if (!profile) return <p style={{ color: "#f87171" }}>Could not load profile.</p>;

    return (
        <div>
            {/* Profile card */}
            <div style={styles.profileCard}>
                <h3 style={styles.h3}>👤 {profile.name}</h3>
                <div style={styles.row}>
                    <span style={styles.badge}>🩸 {profile.bloodType}</span>
                    <span style={styles.meta}>DOB: {profile.dob}</span>
                    <span style={styles.meta}>{profile.gender}</span>
                    <span style={styles.meta}>{profile.count} record{profile.count !== 1 ? "s" : ""}</span>
                </div>
                <p style={styles.tiny}>Registered: {profile.regAt}</p>
            </div>

            {/* Records */}
            <h3 style={{ ...styles.h3, marginTop: "1.5rem" }}>📋 Medical History</h3>
            {records.length === 0 && <p style={{ color: "#64748b" }}>No records yet.</p>}
            {records.map((r, i) => (
                <div key={i} style={styles.record}>
                    <div style={styles.recHeader}>
                        <span style={styles.tag}>{r.recordType}</span>
                        <span style={styles.tiny}>{r.ts}</span>
                    </div>
                    <p style={styles.desc}>{r.description}</p>
                    {r.doctorName && <p style={styles.meta}>👨‍⚕️ {r.doctorName}</p>}
                    {r.institution && <p style={styles.meta}>🏥 {r.institution}</p>}
                </div>
            ))}
        </div>
    );
}

const styles = {
    profileCard: { background: "#1e293b", padding: "1.25rem 1.5rem", borderRadius: "0.75rem", marginBottom: "1rem" },
    h3: { margin: "0 0 0.5rem", color: "#f1f5f9", fontSize: "1.1rem" },
    row: { display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" },
    badge: { background: "#dc2626", color: "#fff", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 },
    meta: { color: "#94a3b8", fontSize: "0.85rem" },
    tiny: { color: "#475569", fontSize: "0.75rem", marginTop: "0.4rem" },
    record: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: "0.6rem", padding: "1rem 1.25rem", marginBottom: "0.75rem" },
    recHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" },
    tag: { background: "#1d4ed8", color: "#fff", padding: "0.15rem 0.5rem", borderRadius: "0.3rem", fontSize: "0.75rem", fontWeight: 600 },
    desc: { color: "#e2e8f0", margin: "0.25rem 0", fontSize: "0.9rem" },
};

"use client";
import { useState, useEffect } from "react";
import { getContractInstance } from "@/lib/contract";

export default function AccessLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchLogs(); }, []);

    async function fetchLogs() {
        setLoading(true);
        try {
            const { contract, address } = await getContractInstance();
            const count = await contract.read.getAccessLogCount({ account: address });
            const items = [];
            for (let i = Number(count) - 1; i >= 0; i--) {
                const [inst, instName, ts, action] =
                    await contract.read.getAccessLog([BigInt(i)], { account: address });
                items.push({ inst, instName, ts: new Date(Number(ts) * 1000).toLocaleString(), action });
            }
            setLogs(items);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <p style={{ color: "#94a3b8" }}>Loading access log…</p>;

    return (
        <div>
            <h3 style={S.h3}>🔍 Institution Access History</h3>
            {logs.length === 0 && <p style={{ color: "#64748b" }}>No institutions have accessed your data yet.</p>}
            {logs.map((l, i) => (
                <div key={i} style={S.row}>
                    <div style={S.rowLeft}>
                        <span style={l.action === "WRITE" ? S.write : S.read}>{l.action}</span>
                        <span style={S.name}>{l.instName}</span>
                    </div>
                    <div style={S.right}>
                        <span style={S.addr}>{l.inst.slice(0, 6)}…{l.inst.slice(-4)}</span>
                        <span style={S.ts}>{l.ts}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

const S = {
    h3: { margin: "0 0 1rem", color: "#13544a", fontSize: "1.2rem", fontWeight: 600 },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "1rem 1.25rem", borderRadius: "1.2rem", marginBottom: "0.8rem", gap: "1rem", flexWrap: "wrap", border: "1px solid #e2e8f0" },
    rowLeft: { display: "flex", alignItems: "center", gap: "0.8rem" },
    read: { background: "#13544a", color: "#fff", padding: "0.25rem 0.6rem", borderRadius: "0.5rem", fontSize: "0.75rem", fontWeight: 600 },
    write: { background: "#256a5c", color: "#fff", padding: "0.25rem 0.6rem", borderRadius: "0.5rem", fontSize: "0.75rem", fontWeight: 600 },
    name: { color: "#1e293b", fontWeight: 600, fontSize: "0.95rem" },
    right: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" },
    addr: { fontFamily: "monospace", color: "#64748b", fontSize: "0.8rem" },
    ts: { color: "#475569", fontSize: "0.8rem" },
};

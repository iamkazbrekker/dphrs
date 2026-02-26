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
    h3: { margin: "0 0 1rem", color: "#f1f5f9", fontSize: "1.1rem" },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e293b", padding: "0.85rem 1rem", borderRadius: "0.5rem", marginBottom: "0.5rem", gap: "1rem", flexWrap: "wrap" },
    rowLeft: { display: "flex", alignItems: "center", gap: "0.6rem" },
    read: { background: "#1d4ed8", color: "#fff", padding: "0.15rem 0.5rem", borderRadius: "0.3rem", fontSize: "0.72rem", fontWeight: 600 },
    write: { background: "#15803d", color: "#fff", padding: "0.15rem 0.5rem", borderRadius: "0.3rem", fontSize: "0.72rem", fontWeight: 600 },
    name: { color: "#e2e8f0", fontWeight: 600, fontSize: "0.9rem" },
    right: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" },
    addr: { fontFamily: "monospace", color: "#94a3b8", fontSize: "0.75rem" },
    ts: { color: "#475569", fontSize: "0.75rem" },
};

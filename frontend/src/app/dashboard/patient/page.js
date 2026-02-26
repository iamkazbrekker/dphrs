"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContractInstance, getCurrentAddress } from "@/lib/contract";
import AddRecord from "@/components/AddRecord";
import ViewRecords from "@/components/patient/ViewRecords";
import AccessLogs from "@/components/patient/AccessLogs";
import KeyCard from "@/components/patient/KeyCard";

export default function PatientDashboard() {
    const router = useRouter();
    const [address, setAddress] = useState("");
    const [tab, setTab] = useState("records"); // records | add | access | keys
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const addr = await getCurrentAddress();
                setAddress(addr);
                const { contract, address: a } = await getContractInstance();
                const ok = await contract.read.isRegistered({ account: a });
                if (!ok) router.push("/");
            } catch { router.push("/"); }
        })();
        if (window.ethereum)
            window.ethereum.on("accountsChanged", () => window.location.reload());
    }, []);

    const tabs = [
        { id: "records", label: "📋 Records" },
        { id: "add", label: "➕ Add Record" },
        { id: "access", label: "🔍 Access Log" },
        { id: "keys", label: "🔑 My Keys" },
    ];

    return (
        <main style={S.page}>
            <div style={S.topbar}>
                <span style={S.logo}>🏥 DPHRS — Patient</span>
                <span style={S.addr}>{address ? address.slice(0, 6) + "…" + address.slice(-4) : ""}</span>
                <button style={S.signout} onClick={() => { sessionStorage.setItem("disconnected", "true"); router.push("/"); }}>
                    Sign Out
                </button>
            </div>

            <div style={S.content}>
                <div style={S.tabs}>
                    {tabs.map(t => (
                        <button key={t.id}
                            style={tab === t.id ? S.tabActive : S.tab}
                            onClick={() => setTab(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === "records" && <ViewRecords refresh={refresh} />}
                {tab === "add" && <AddRecord onAdded={() => { setTab("records"); setRefresh(r => r + 1); }} />}
                {tab === "access" && <AccessLogs />}
                {tab === "keys" && <KeyCard address={address} />}
            </div>
        </main>
    );
}

const S = {
    page: { minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" },
    topbar: { display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 2rem", background: "#1e293b", borderBottom: "1px solid #334155" },
    logo: { fontWeight: 700, fontSize: "1.2rem", flex: 1 },
    addr: { fontFamily: "monospace", fontSize: "0.85rem", color: "#94a3b8" },
    signout: { padding: "0.4rem 0.9rem", background: "transparent", border: "1px solid #475569", color: "#94a3b8", borderRadius: "0.4rem", cursor: "pointer", fontSize: "0.85rem" },
    content: { maxWidth: "720px", margin: "2rem auto", padding: "0 1rem" },
    tabs: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" },
    tab: { flex: 1, padding: "0.6rem 0.4rem", background: "#1e293b", border: "none", color: "#94a3b8", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.85rem", minWidth: "100px" },
    tabActive: { flex: 1, padding: "0.6rem 0.4rem", background: "#3b82f6", border: "none", color: "#fff", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, minWidth: "100px" },
};

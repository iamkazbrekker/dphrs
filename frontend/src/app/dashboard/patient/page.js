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
    page: { minHeight: "100vh", background: "#dee6e5", color: "#1e293b", fontFamily: "'Inter', sans-serif" },
    topbar: { display: "flex", alignItems: "center", gap: "1rem", padding: "1.2rem 2.5rem", background: "transparent" },
    logo: { fontWeight: 700, fontSize: "1.3rem", color: "#13544a", flex: 1 },
    addr: { fontFamily: "monospace", fontSize: "0.85rem", color: "#475569", background: "#ffffff", padding: "0.3rem 0.6rem", borderRadius: "0.4rem", border: "1px solid #e2e8f0" },
    signout: { padding: "0.5rem 1rem", background: "#ffffff", border: "none", color: "#1e293b", borderRadius: "2rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
    content: { maxWidth: "780px", margin: "1rem auto 3rem", padding: "0 1.5rem" },
    tabs: { display: "flex", gap: "0.8rem", marginBottom: "1.5rem", flexWrap: "wrap" },
    tab: { flex: 1, padding: "0.8rem", background: "#ffffff", border: "none", color: "#64748b", borderRadius: "1.5rem", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500, minWidth: "100px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" },
    tabActive: { flex: 1, padding: "0.8rem", background: "#badd93", border: "none", color: "#13544a", borderRadius: "1.5rem", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, minWidth: "100px", boxShadow: "0 4px 15px rgba(186,221,147,0.25)" },
};

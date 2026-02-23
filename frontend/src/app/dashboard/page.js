"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContractInstance, getCurrentAddress } from "@/lib/contract";
import AddRecord from "@/components/AddRecord";
import ViewRecords from "@/components/ViewRecords";

export default function Dashboard() {
    const router = useRouter();
    const [address, setAddress] = useState("");
    const [refresh, setRefresh] = useState(0);
    const [tab, setTab] = useState("view"); // view | add

    useEffect(() => {
        (async () => {
            try {
                const addr = await getCurrentAddress();
                setAddress(addr);
                const { contract, address: connectionAddr } = await getContractInstance();
                const ok = await contract.read.isRegistered({ account: connectionAddr });
                if (!ok) router.push("/");
            } catch { router.push("/"); }
        })();
    }, []);

    function handleAdded() {
        setTab("view");
        setRefresh(r => r + 1);
    }

    async function handleDisconnect() {
        sessionStorage.setItem("disconnected", "true");
        router.push("/");
    }

    return (
        <main style={styles.page}>
            <div style={styles.topbar}>
                <span style={styles.logo}>🏥 DPHRS</span>
                <span style={styles.addr}>{address ? address.slice(0, 6) + "…" + address.slice(-4) : ""}</span>
                <button style={styles.signout} onClick={handleDisconnect}>Sign Out</button>
            </div>

            <div style={styles.content}>
                <div style={styles.tabs}>
                    <button style={tab === "view" ? styles.tabActive : styles.tab} onClick={() => setTab("view")}>View Records</button>
                    <button style={tab === "add" ? styles.tabActive : styles.tab} onClick={() => setTab("add")}>Add Record</button>
                </div>

                {tab === "view" && <ViewRecords refresh={refresh} />}
                {tab === "add" && <AddRecord onAdded={handleAdded} />}
            </div>
        </main>
    );
}

const styles = {
    page: { minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" },
    topbar: { display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 2rem", background: "#1e293b", borderBottom: "1px solid #334155" },
    logo: { fontWeight: 700, fontSize: "1.2rem", flex: 1 },
    addr: { fontFamily: "monospace", fontSize: "0.85rem", color: "#94a3b8" },
    signout: { padding: "0.4rem 0.9rem", background: "transparent", border: "1px solid #475569", color: "#94a3b8", borderRadius: "0.4rem", cursor: "pointer", fontSize: "0.85rem" },
    content: { maxWidth: "700px", margin: "2rem auto", padding: "0 1rem" },
    tabs: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem" },
    tab: { flex: 1, padding: "0.6rem", background: "#1e293b", border: "none", color: "#94a3b8", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.95rem" },
    tabActive: { flex: 1, padding: "0.6rem", background: "#3b82f6", border: "none", color: "#fff", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600 },
};

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContractInstance, getCurrentAddress, CONTRACT_CHAIN_ID, promptAccountSwitch } from "@/lib/contract";

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ name: "", dob: "", bloodType: "A+", gender: "" });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("check"); // check | register | login

  // On load, check if already registered, unless they just signed out
  useEffect(() => {
    if (sessionStorage.getItem("disconnected") !== "true") {
      checkNetwork();
    } else {
      setView("register");
    }

    // Automatically reload if they change account in extension
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => window.location.reload());
    }
  }, []);

  async function checkNetwork() {
    if (!window.ethereum) { setStatus("MetaMask not detected."); return; }
    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (parseInt(chainId, 16) !== CONTRACT_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${CONTRACT_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${CONTRACT_CHAIN_ID.toString(16)}`,
                chainName: 'Hardhat Local',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
              }],
            });
          } else {
            throw switchError;
          }
        }
      }
      checkRegistration();
    } catch (e: any) {
      if (e.code === 4001) {
        setStatus(`Please approve the network switch in MetaMask.`);
      } else {
        setStatus(`Wrong network. Please switch MetaMask to Hardhat Local (chainId ${CONTRACT_CHAIN_ID}).`);
      }
    }
  }

  async function checkRegistration() {
    try {
      const { contract, address } = await getContractInstance();
      const registered = await contract.read.isRegistered({ account: address });
      if (registered) {
        router.push("/dashboard");
      } else {
        setView("register");
      }
    } catch (e) {
      setView("register");
    }
  }

  async function handleRegister(e: any) {
    sessionStorage.removeItem("disconnected");
    e.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const { contract, publicClient, address } = await getContractInstance();
      const dob = BigInt(Math.floor(new Date(form.dob).getTime() / 1000));
      const hash = await contract.write.register([form.name, dob, form.bloodType, form.gender], { account: address });
      setStatus("Waiting for transaction confirmation...");
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("Registered successfully!");
      router.push("/dashboard");
    } catch (err) {
      setStatus("Error: " + (err.shortMessage || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    sessionStorage.removeItem("disconnected");
    setLoading(true);
    setStatus("");
    try {
      const { contract, address } = await getContractInstance();
      const registered = await contract.read.isRegistered({ account: address });
      if (registered) {
        router.push("/dashboard");
      } else {
        setStatus("This wallet is not registered. Please register first.");
        setView("register");
      }
    } catch (err) {
      setStatus("Error: " + (err.shortMessage || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchAccount() {
    try {
      await promptAccountSwitch();
    } catch {
      // User rejected or ignored
    }
  }

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🏥 DPHRS</h1>
        <p style={styles.subtitle}>Decentralised Patient Health Records</p>

        {view === "check" && <p>Connecting to your wallet…</p>}

        {view === "register" && (
          <>
            <h2 style={styles.h2}>Welcome to DPHRS</h2>
            <p style={styles.note}>Your wallet works as your identity. No passwords needed.</p>
            <form onSubmit={handleRegister} style={styles.form}>
              <input
                style={styles.input}
                placeholder="Full Name"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              <label style={styles.label}>Date of Birth</label>
              <input
                style={styles.input}
                type="date"
                required
                value={form.dob}
                onChange={e => setForm({ ...form, dob: e.target.value })}
              />
              <select
                style={styles.input}
                value={form.bloodType}
                onChange={e => setForm({ ...form, bloodType: e.target.value })}
              >
                {bloodTypes.map(bt => <option key={bt}>{bt}</option>)}
              </select>
              <select
                style={styles.input}
                value={form.gender}
                required
                onChange={e => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <button style={styles.btn} type="submit" disabled={loading}>
                {loading ? "Processing…" : "Register with MetaMask"}
              </button>
            </form>
            <p style={styles.link} onClick={handleLogin}>Already registered? Sign in →</p>
            <p style={{ ...(styles.link as React.CSSProperties), marginTop: "0.25rem", fontSize: "0.8rem", color: "#94a3b8" }} onClick={handleSwitchAccount}>Need to change wallet? Switch MetaMask Account</p>
          </>
        )}

        {status && <p style={styles.status}>{status}</p>}
      </div>
    </main>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" },
  card: { background: "#1e293b", padding: "2.5rem", borderRadius: "1rem", width: "100%", maxWidth: "420px", color: "#f1f5f9", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" },
  title: { fontSize: "2rem", fontWeight: 700, textAlign: "center", margin: 0 },
  subtitle: { textAlign: "center", color: "#94a3b8", marginBottom: "2rem" },
  h2: { fontSize: "1.2rem", marginBottom: "0.5rem" },
  note: { fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  label: { fontSize: "0.8rem", color: "#94a3b8" },
  input: { padding: "0.65rem 0.9rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.95rem" },
  btn: { padding: "0.75rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontSize: "1rem", fontWeight: 600 },
  link: { marginTop: "1rem", textAlign: "center", color: "#3b82f6", cursor: "pointer", fontSize: "0.9rem" },
  status: { marginTop: "1rem", padding: "0.75rem", background: "#0f172a", borderRadius: "0.5rem", fontSize: "0.85rem", color: "#fbbf24" }
};

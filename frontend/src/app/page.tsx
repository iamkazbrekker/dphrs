"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContractInstance, CONTRACT_CHAIN_ID } from "@/lib/contract";

declare global { interface Window { ethereum?: any; } }

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"role" | "patient-register" | "hospital-register">("role");
  const [loading, setLoading] = useState(false);
  const [pForm, setPForm] = useState({ name: "", dob: "", bloodType: "A+", gender: "" });
  const [hForm, setHForm] = useState({ name: "", type: "Hospital", location: "", registrationId: "" });

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => {
        sessionStorage.removeItem("disconnected");
        window.location.reload();
      });
    }
    ensureNetwork();
  }, []);

  async function ensureNetwork() {
    if (!window.ethereum) { setStatus("MetaMask not detected."); return; }
    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (parseInt(chainId, 16) !== CONTRACT_CHAIN_ID) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${CONTRACT_CHAIN_ID.toString(16)}` }],
        });
      }
      await autoRedirect();
    } catch { /* user can manually choose role */ }
  }

  async function autoRedirect() {
    if (sessionStorage.getItem("disconnected") === "true") return;
    try {
      const { contract, address } = await getContractInstance();
      const isPatient = await contract.read.isRegistered({ account: address });
      if (isPatient) { router.push("/dashboard/patient"); return; }
      const isHospital = await contract.read.isInstitutionRegistered({ account: address });
      if (isHospital) { router.push("/dashboard/hospital"); return; }
    } catch { /* not connected yet */ }
  }

  async function handlePatientRegister(e: any) {
    e.preventDefault();
    setLoading(true); setStatus("");
    sessionStorage.removeItem("disconnected");
    try {
      const { contract, publicClient, address } = await getContractInstance();
      const dob = BigInt(Math.floor(new Date(pForm.dob).getTime() / 1000));
      const hash = await contract.write.register(
        [pForm.name, dob, pForm.bloodType, pForm.gender], { account: address }
      );
      setStatus("Waiting for confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      router.push("/dashboard/patient");
    } catch (err: any) {
      setStatus("Error: " + (err.shortMessage || err.message));
    } finally { setLoading(false); }
  }

  async function handleHospitalRegister(e: any) {
    e.preventDefault();
    setLoading(true); setStatus("");
    sessionStorage.removeItem("disconnected");
    try {
      const { contract, publicClient, address } = await getContractInstance();
      const hash = await contract.write.registerInstitution(
        [hForm.name, hForm.type, hForm.location, hForm.registrationId], { account: address }
      );
      setStatus("Waiting for confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      router.push("/dashboard/hospital");
    } catch (err: any) {
      setStatus("Error: " + (err.shortMessage || err.message));
    } finally { setLoading(false); }
  }

  async function handleLogin(destination: "/dashboard/patient" | "/dashboard/hospital") {
    setLoading(true); setStatus("");
    sessionStorage.removeItem("disconnected");
    try {
      const { contract, address } = await getContractInstance();
      if (destination === "/dashboard/patient") {
        const ok = await contract.read.isRegistered({ account: address });
        if (ok) { router.push(destination); return; }
        setStatus("Not registered as a patient."); setView("patient-register");
      } else {
        const ok = await contract.read.isInstitutionRegistered({ account: address });
        if (ok) { router.push(destination); return; }
        setStatus("Not registered as an institution."); setView("hospital-register");
      }
    } catch (err: any) {
      setStatus("Error: " + (err.shortMessage || err.message));
    } finally { setLoading(false); }
  }

  async function handleChangeAccount() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });
    } catch (err: any) {
      console.log(err);
    }
  }

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const instTypes = ["Hospital", "Clinic", "Lab", "Pharmacy", "Diagnostic Centre"];

  return (
    <main style={S.container}>
      <div style={S.card}>
        <h1 style={S.title}>🏥 DPHRS</h1>
        <p style={S.subtitle}>Decentralised Patient Health Records</p>

        {view === "role" && (
          <>
            <p style={S.note}>Choose how you are connecting:</p>
            <div style={S.roleRow}>
              <button style={S.roleBtn} onClick={() => setView("patient-register")}>
                👤 I&apos;m a Patient
              </button>
              <button style={{ ...S.roleBtn, background: "#0d9488" }}
                onClick={() => setView("hospital-register")}>
                🏨 I&apos;m a Hospital
              </button>
            </div>
            <p style={S.link} onClick={() => handleLogin("/dashboard/patient")}>
              Already a patient? Sign in →
            </p>
            <p style={{ ...S.link, marginTop: "0.25rem" }}
              onClick={() => handleLogin("/dashboard/hospital")}>
              Institution already registered? Sign in →
            </p>
            <button style={{ ...S.btn, marginTop: "2rem", background: "#475569", width: "100%", fontSize: "0.85rem" }} onClick={handleChangeAccount}>
              🔄 Dev: Change Active Account
            </button>
          </>
        )}

        {view === "patient-register" && (
          <>
            <h2 style={S.h2}>Register as Patient</h2>
            <form onSubmit={handlePatientRegister} style={S.form}>
              <input style={S.input} placeholder="Full Name" required
                value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} />
              <label style={S.label}>Date of Birth</label>
              <input style={S.input} type="date" required
                value={pForm.dob} onChange={e => setPForm({ ...pForm, dob: e.target.value })} />
              <select style={S.input} value={pForm.bloodType}
                onChange={e => setPForm({ ...pForm, bloodType: e.target.value })}>
                {bloodTypes.map(b => <option key={b}>{b}</option>)}
              </select>
              <select style={S.input} value={pForm.gender} required
                onChange={e => setPForm({ ...pForm, gender: e.target.value })}>
                <option value="">Select Gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
              <button style={S.btn} type="submit" disabled={loading}>
                {loading ? "Processing…" : "Register with MetaMask"}
              </button>
            </form>
            <p style={S.link} onClick={() => setView("role")}>← Back</p>
          </>
        )}

        {view === "hospital-register" && (
          <>
            <h2 style={S.h2}>Register Institution</h2>
            <form onSubmit={handleHospitalRegister} style={S.form}>
              <input style={S.input} placeholder="Institution Name" required
                value={hForm.name} onChange={e => setHForm({ ...hForm, name: e.target.value })} />
              <select style={S.input} value={hForm.type}
                onChange={e => setHForm({ ...hForm, type: e.target.value })}>
                {instTypes.map(t => <option key={t}>{t}</option>)}
              </select>
              <input style={S.input} placeholder="Location" required
                value={hForm.location} onChange={e => setHForm({ ...hForm, location: e.target.value })} />
              <input style={S.input} placeholder="Registration ID" required
                value={hForm.registrationId} onChange={e => setHForm({ ...hForm, registrationId: e.target.value })} />
              <button style={{ ...S.btn, background: "#0d9488" }} type="submit" disabled={loading}>
                {loading ? "Processing…" : "Register Institution"}
              </button>
            </form>
            <p style={S.link} onClick={() => setView("role")}>← Back</p>
          </>
        )}

        {status && <p style={S.status}>{status}</p>}
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" },
  card: { background: "#1e293b", padding: "2.5rem", borderRadius: "1rem", width: "100%", maxWidth: "440px", color: "#f1f5f9", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" },
  title: { fontSize: "2rem", fontWeight: 700, textAlign: "center", margin: 0 },
  subtitle: { textAlign: "center", color: "#94a3b8", marginBottom: "1.5rem" },
  note: { textAlign: "center", color: "#64748b", marginBottom: "1rem", fontSize: "0.9rem" },
  h2: { fontSize: "1.2rem", marginBottom: "0.5rem" },
  label: { fontSize: "0.8rem", color: "#94a3b8" },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  input: { padding: "0.65rem 0.9rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.95rem" },
  btn: { padding: "0.75rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontSize: "1rem", fontWeight: 600 },
  roleRow: { display: "flex", gap: "1rem", marginBottom: "1rem" },
  roleBtn: { flex: 1, padding: "1rem 0.5rem", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "0.75rem", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600 },
  link: { marginTop: "1rem", textAlign: "center", color: "#3b82f6", cursor: "pointer", fontSize: "0.9rem" },
  status: { marginTop: "1rem", padding: "0.75rem", background: "#0f172a", borderRadius: "0.5rem", fontSize: "0.85rem", color: "#fbbf24" },
};

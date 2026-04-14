"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContractInstance, CONTRACT_CHAIN_ID } from "@/lib/contract";

declare global { interface Window { ethereum?: any; } }

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [view, setView] = useState<
    "role" | "patient-register" | "hospital-register" | "researcher-register"
  >("role");
  const [loading, setLoading] = useState(false);
  const [pForm, setPForm] = useState({ name: "", dob: "", bloodType: "A+", gender: "" });
  const [hForm, setHForm] = useState({ name: "", type: "Hospital", location: "", registrationId: "" });
  const [rForm, setRForm] = useState({ name: "", institution: "", researchField: "", licenseId: "" });

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
      const isResearcher = await contract.read.isResearcherRegistered({ account: address });
      if (isResearcher) { router.push("/dashboard/researcher"); return; }
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

  async function handleResearcherRegister(e: any) {
    e.preventDefault();
    setLoading(true); setStatus("");
    sessionStorage.removeItem("disconnected");
    try {
      const { contract, publicClient, address } = await getContractInstance();
      const hash = await contract.write.registerResearcher(
        [rForm.name, rForm.institution, rForm.researchField, rForm.licenseId],
        { account: address }
      );
      setStatus("Waiting for confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      router.push("/dashboard/researcher");
    } catch (err: any) {
      setStatus("Error: " + (err.shortMessage || err.message));
    } finally { setLoading(false); }
  }

  async function handleLogin(destination: "/dashboard/patient" | "/dashboard/hospital" | "/dashboard/researcher") {
    setLoading(true); setStatus("");
    sessionStorage.removeItem("disconnected");
    try {
      const { contract, address } = await getContractInstance();
      if (destination === "/dashboard/patient") {
        const ok = await contract.read.isRegistered({ account: address });
        if (ok) { router.push(destination); return; }
        setStatus("Not registered as a patient."); setView("patient-register");
      } else if (destination === "/dashboard/hospital") {
        const ok = await contract.read.isInstitutionRegistered({ account: address });
        if (ok) { router.push(destination); return; }
        setStatus("Not registered as an institution."); setView("hospital-register");
      } else {
        const ok = await contract.read.isResearcherRegistered({ account: address });
        if (ok) { router.push(destination); return; }
        setStatus("Not registered as a researcher."); setView("researcher-register");
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
  const researchFields = [
    "Epidemiology", "Clinical Trials", "Genomics", "Public Health",
    "Oncology", "Cardiology", "Neurology", "Pharmacology", "Other"
  ];

  return (
    <main style={S.container}>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "2.2rem", color: "#13544a", fontWeight: "bold" }}>S</span>
          <h1 style={S.title}>DPHRS</h1>
        </div>
        <p style={S.subtitle}>Decentralised Patient Health Records</p>

        {view === "role" && (
          <>
            <p style={S.note}>Choose how you are connecting:</p>
            <div style={S.roleGrid}>
              <button style={S.roleBtnWhite} onClick={() => setView("patient-register")}>
                <span style={S.roleBtnIcon}>👤</span>
                <span>Patient</span>
              </button>
              <button style={S.roleBtnLime} onClick={() => setView("hospital-register")}>
                <span style={S.roleBtnIcon}>🏥</span>
                <span>Hospital</span>
              </button>
              <button style={S.roleBtnDark} onClick={() => setView("researcher-register")}>
                <span style={S.roleBtnIcon}>🔬</span>
                <span>Researcher</span>
              </button>
            </div>

            <div style={S.divider}><span style={S.dividerLine}></span><span style={S.dividerText}>Already registered?</span><span style={S.dividerLine}></span></div>

            <p style={S.link} onClick={() => handleLogin("/dashboard/patient")}>
              Sign in as Patient →
            </p>
            <p style={S.link} onClick={() => handleLogin("/dashboard/hospital")}>
              Sign in as Institution →
            </p>
            <p style={S.link} onClick={() => handleLogin("/dashboard/researcher")}>
              Sign in as Researcher →
            </p>

            <button style={{ ...S.btn, marginTop: "2rem", background: "#f8fafc", color: "#4a5568", border: "1px solid #e2e8f0", width: "100%", fontSize: "0.85rem", padding: "0.8rem", boxShadow: "none" }}
              onClick={handleChangeAccount}>
              🔄 Dev: Switch MetaMask Account
            </button>
          </>
        )}

        {view === "patient-register" && (
          <>
            <h2 style={S.h2}>👤 Register as Patient</h2>
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
                {loading ? "Processing…" : "Register"}
              </button>
            </form>
            <p style={S.link} onClick={() => setView("role")}>← Back</p>
          </>
        )}

        {view === "hospital-register" && (
          <>
            <h2 style={S.h2}>🏥 Register Institution</h2>
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
              <button style={{ ...S.btn, background: "#badd93", color: "#13544a", boxShadow: "0 4px 15px rgba(186,221,147,0.3)" }} type="submit" disabled={loading}>
                {loading ? "Processing…" : "Register Institution"}
              </button>
            </form>
            <p style={S.link} onClick={() => setView("role")}>← Back</p>
          </>
        )}

        {view === "researcher-register" && (
          <>
            <h2 style={S.h2}>🔬 Register as Researcher</h2>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1rem", lineHeight: 1.4 }}>
              Gain on-chain verified access to anonymized patient datasets for academic research.
            </p>
            <form onSubmit={handleResearcherRegister} style={S.form}>
              <input style={S.input} placeholder="Full Name" required
                value={rForm.name} onChange={e => setRForm({ ...rForm, name: e.target.value })} />
              <input style={S.input} placeholder="Research Institution / University" required
                value={rForm.institution} onChange={e => setRForm({ ...rForm, institution: e.target.value })} />
              <select style={S.input} value={rForm.researchField}
                onChange={e => setRForm({ ...rForm, researchField: e.target.value })}>
                <option value="">Select Research Field</option>
                {researchFields.map(f => <option key={f}>{f}</option>)}
              </select>
              <input style={S.input} placeholder="Research License / IRB ID" required
                value={rForm.licenseId} onChange={e => setRForm({ ...rForm, licenseId: e.target.value })} />
              <button style={S.btn} type="submit" disabled={loading}>
                {loading ? "Processing…" : "Register as Researcher"}
              </button>
            </form>
            <p style={S.link} onClick={() => setView("role")}>← Back</p>
          </>
        )}

        {status && <p style={S.status}>{status}</p>}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif !important; margin: 0; background: #dee6e5; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#dee6e5", padding: "2rem 1rem" },
  card: { background: "#ffffff", padding: "3rem 2.5rem", borderRadius: "2rem", width: "100%", maxWidth: "460px", color: "#1e293b", boxShadow: "0 10px 40px rgba(0,0,0,0.04)", animation: "fadeIn 0.5s ease" },
  title: { fontSize: "1.8rem", fontWeight: 700, margin: 0, color: "#1e293b" },
  subtitle: { textAlign: "center", color: "#64748b", marginBottom: "2.5rem", fontSize: "0.95rem" },
  note: { textAlign: "center", color: "#475569", marginBottom: "1.2rem", fontSize: "0.9rem", fontWeight: 500 },
  h2: { fontSize: "1.3rem", margin: "0 0 1rem", color: "#13544a", fontWeight: 600 },
  label: { fontSize: "0.85rem", color: "#475569", fontWeight: 500, marginLeft: "0.2rem" },
  form: { display: "flex", flexDirection: "column", gap: "0.9rem" },
  input: { padding: "0.9rem 1.1rem", borderRadius: "1rem", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#1e293b", fontSize: "0.95rem", width: "100%", outline: "none", transition: "border 0.2s" },
  btn: { padding: "1rem", background: "#13544a", color: "#fff", border: "none", borderRadius: "2rem", cursor: "pointer", fontSize: "1rem", fontWeight: 600, transition: "transform 0.1s, boxShadow 0.2s", boxShadow: "0 4px 15px rgba(19,84,74,0.15)" },
  roleGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.85rem", marginBottom: "1.5rem" },
  
  roleBtnWhite: { padding: "1.2rem 0.2rem", background: "#ffffff", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: "1.2rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" },
  roleBtnLime: { padding: "1.2rem 0.2rem", background: "#badd93", color: "#13544a", border: "none", borderRadius: "1.2rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", transition: "all 0.2s", boxShadow: "0 4px 15px rgba(186,221,147,0.25)" },
  roleBtnDark: { padding: "1.2rem 0.2rem", background: "#13544a", color: "#ffffff", border: "none", borderRadius: "1.2rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", transition: "all 0.2s", boxShadow: "0 4px 15px rgba(19,84,74,0.15)" },
  
  roleBtnIcon: { fontSize: "1.8rem" },
  divider: { display: "flex", alignItems: "center", margin: "1.8rem 0 1.2rem", gap: "1rem" },
  dividerLine: { flex: 1, height: "1px", background: "#e2e8f0" },
  dividerText: { color: "#64748b", fontSize: "0.85rem", fontWeight: 500 },
  link: { marginTop: "0.6rem", textAlign: "center", color: "#256a5c", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600, textDecoration: "none", transition: "opacity 0.2s" },
  status: { marginTop: "1.2rem", padding: "1rem", background: "#f8fafc", borderRadius: "1rem", fontSize: "0.9rem", color: "#13544a", border: "1px solid #e2e8f0", textAlign: "center", fontWeight: 500 },
};

"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getContractInstance, getCurrentAddress } from "@/lib/contract";
import Papa from "papaparse";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const PALETTE = {
  darkGreen: "#13544a",
  midGreen:  "#256a5c",
  lightLime: "#badd93",
  white:     "#ffffff",
  textDark:  "#1e293b",
  textMuted: "#475569",
  bgLight:   "#dee6e5",
  grayBorder:"#e2e8f0"
};

const PIE_COLORS = [
  "#13544a", "#badd93", "#256a5c", "#81c784",
  "#4caf50", "#388e3c", "#aed581", "#004d40"
];

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function StatCard({ icon, label, value, sub, variant }) {
  let cardStyle = S.card;
  let valColor = "#13544a";
  let labelColor = "#475569";
  let subColor = "#64748b";

  if (variant === "dark") {
    cardStyle = S.cardDark;
    valColor = "#ffffff";
    labelColor = "#badd93";
    subColor = "#94a3b8";
  } else if (variant === "lime") {
    cardStyle = S.cardGreen;
    valColor = "#13544a";
    labelColor = "#256a5c";
  }

  return (
    <div style={cardStyle}>
      <div style={S.cardBody}>
        <div style={S.cardValueRow}>
          <div style={{ ...S.cardValue, color: valColor }}>{value}</div>
          <div style={S.cardIconWrap}>{icon}</div>
        </div>
        <div style={{ ...S.cardLabel, color: labelColor }}>{label}</div>
        {sub && <div style={{ ...S.cardSub, color: subColor }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div style={S.sectionHeader}>
      <h2 style={S.sectionTitle}>{title}</h2>
      {description && <p style={S.sectionDesc}>{description}</p>}
    </div>
  );
}

function DataTable({ records }) {
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;
  const total = records.length;
  const slice = records.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  return (
    <div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {["Patient ID","Blood Type","Gender","Record Type","Institution","Date","Description"].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i} style={S.trElement}>
                <td style={S.td}><span style={S.pid}>P-{r.patientIndex.toString().padStart(4, "0")}</span></td>
                <td style={S.td}><span style={{ ...S.badge, background: bloodColor(r.bloodType) }}>{r.bloodType}</span></td>
                <td style={S.td}><span style={S.genderBadge}>{r.gender}</span></td>
                <td style={S.td}><span style={S.recTypeBadge}>{r.recordType}</span></td>
                <td style={S.td}>{r.institution || "—"}</td>
                <td style={S.td}>{new Date(Number(r.timestamp) * 1000).toLocaleDateString()}</td>
                <td style={{ ...S.td, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={S.pagRow}>
        <button style={S.pagBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={S.pagInfo}>Page {page + 1} / {Math.max(1, Math.ceil(total / PER_PAGE))}  ({total} records)</span>
        <button style={S.pagBtn} disabled={(page + 1) * PER_PAGE >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );
}

function bloodColor(bt) {
  const m = { "A+":"#f87171","A-":"#ef4444","B+":"#fb923c","B-":"#f97316","AB+":"#c084fc","AB-":"#a855f7","O+":"#38bdf8","O-":"#0ea5e9" };
  return m[bt] || "#64748b";
}

export default function ResearcherDashboard() {
  const router = useRouter();

  const [address, setAddress] = useState("");
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [demographics, setDemographics] = useState(null);
  const [recordBreakdown, setRecordBreakdown] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [anonymizedRecords, setAnonymizedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    (async () => {
      try {
        const addr = await getCurrentAddress();
        setAddress(addr);
        const { contract, address: a, publicClient } = await getContractInstance();
        const ok = await contract.read.isResearcherRegistered({ account: a });
        if (!ok) { router.push("/"); return; }

        const prof = await contract.read.getResearcherProfile({ account: a });
        setProfile({
          name: prof[0], institution: prof[1],
          researchField: prof[2], licenseId: prof[3],
          registeredAt: new Date(Number(prof[4]) * 1000).toLocaleDateString(),
          dataAccessCount: Number(prof[5]),
        });

        const cfgAddr = (await import("@/lib/contract-config.json")).default.address;
        const cfgAbi  = (await import("@/lib/contract-config.json")).default.abi;

        const statsRaw = await publicClient.readContract({
          address: cfgAddr, abi: cfgAbi,
          functionName: "getDatasetStats", account: a,
        });
        let bcStats = {
          totalPatients: Number(statsRaw[0]),
          totalRecords: Number(statsRaw[1]),
        };

        const demRaw = await publicClient.readContract({
          address: cfgAddr, abi: cfgAbi,
          functionName: "getDemographicsSummary", account: a,
        });
        let bcDem = {
          bloodTypes: demRaw[0].map((bt, i) => ({ name: bt, value: Number(demRaw[1][i]) })),
          gender: [
            { name: "Male", value: Number(demRaw[2]) },
            { name: "Female", value: Number(demRaw[3]) },
            { name: "Other", value: Number(demRaw[4]) },
          ],
        };

        const rbRaw = await publicClient.readContract({
          address: cfgAddr, abi: cfgAbi,
          functionName: "getRecordTypeBreakdown", account: a,
        });
        let bcRb = rbRaw[0].map((rt, i) => ({ name: rt, count: Number(rbRaw[1][i]) }));

        const tlRaw = await publicClient.readContract({
          address: cfgAddr, abi: cfgAbi,
          functionName: "getTimelineData", account: a,
        });
        const now = new Date();
        let bcTl = Array(12).fill(0);
        tlRaw[1].forEach((cnt, idx) => {
          const m = new Date(now);
          m.setMonth(m.getMonth() - (11 - idx));
          bcTl[m.getMonth()] += Number(cnt);
        });

        Papa.parse("/indian_diseases_dataset.csv", {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = results.data;
            const pts = new Set();
            let mockMale = 0, mockFemale = 0, mockOther = 0;
            const mockBlood = {};
            const mockRb = {};
            const mockTl = Array(12).fill(0);
            
            rows.forEach(r => {
               if(r.patient_id) pts.add(r.patient_id);
               const g = r.gender;
               if(g === "Male") mockMale++;
               else if(g === "Female") mockFemale++;
               else mockOther++;
               
               const b = r.blood_group;
               if(b) mockBlood[b] = (mockBlood[b] || 0) + 1;
               
               const c = r.disease_category;
               if(c) mockRb[c] = (mockRb[c] || 0) + 1;
               
               const mo = r.month;
               const dIdx = MONTH_LABELS.indexOf(mo?.substring(0, 3));
               if(dIdx >= 0) mockTl[dIdx]++;
            });

            setStats({
               totalPatients: bcStats.totalPatients + pts.size,
               totalRecords: bcStats.totalRecords + rows.length
            });

            const combinedBloods = [...bcDem.bloodTypes];
            Object.keys(mockBlood).forEach(k => {
               const existing = combinedBloods.find(x => x.name === k);
               if(existing) existing.value += mockBlood[k];
               else combinedBloods.push({ name: k, value: mockBlood[k] });
            });

            setDemographics({
               bloodTypes: combinedBloods,
               gender: [
                  { name: "Male", value: bcDem.gender[0].value + mockMale},
                  { name: "Female", value: bcDem.gender[1].value + mockFemale},
                  { name: "Other", value: bcDem.gender[2].value + mockOther}
               ]
            });
            
            const combinedRb = [...bcRb];
            Object.keys(mockRb).forEach(k => {
               const existing = combinedRb.find(x => x.name === k);
               if(existing) existing.count += mockRb[k];
               else combinedRb.push({name: k, count: mockRb[k]});
            });
            setRecordBreakdown(combinedRb);

            const finalTl = MONTH_LABELS.map((lbl, i) => ({ month: lbl, records: bcTl[i] + mockTl[i] }));
            setTimeline(finalTl);
            setLoading(false);
          },
          error: (err) => {
            console.error("Error fetching mock dataset:", err);
            setStats(bcStats);
            setDemographics(bcDem);
            setRecordBreakdown(bcRb);
            const fallbackTl = MONTH_LABELS.map((lbl, i) => ({ month: lbl, records: bcTl[i] }));
            setTimeline(fallbackTl);
            setLoading(false);
          }
        });

      } catch (err) {
        console.error(err);
        router.push("/");
        setLoading(false);
      }
    })();
    if (typeof window !== "undefined" && window.ethereum)
      window.ethereum.on("accountsChanged", () => window.location.reload());
  }, []);

  async function fetchDataset() {
    setDataLoading(true); setStatus("Fetching anonymized records from blockchain and mock dataset…");
    try {
      const { contract, publicClient, address: a } = await getContractInstance();
      const cfgAddr = (await import("@/lib/contract-config.json")).default.address;
      const cfgAbi  = (await import("@/lib/contract-config.json")).default.abi;

      const bcStatsRaw = await publicClient.readContract({
        address: cfgAddr, abi: cfgAbi,
        functionName: "getDatasetStats", account: a,
      });
      const onChainPats = Number(bcStatsRaw[0]);

      let recs = [];
      if (onChainPats > 0) {
        const hash = await contract.write.getAnonymizedBatch([BigInt(0), BigInt(onChainPats)], { account: a });
        setStatus("Waiting for transaction confirmation…");
        await publicClient.waitForTransactionReceipt({ hash });

        const result = await publicClient.simulateContract({
          address: cfgAddr, abi: cfgAbi,
          functionName: "getAnonymizedBatch",
          args: [BigInt(0), BigInt(onChainPats)],
          account: a,
        });

        recs = result.result.map(r => ({
          timestamp: r.timestamp,
          recordType: r.recordType,
          description: r.description,
          institution: r.institution,
          bloodType: r.bloodType,
          gender: r.gender,
          patientIndex: Number(r.patientIndex),
        }));
      }

      Papa.parse("/indian_diseases_dataset.csv", {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: async (res) => {
             const mockRecs = res.data.map((r, i) => ({
                 timestamp: r.diagnosis_date ? Math.floor(new Date(r.diagnosis_date).getTime() / 1000) : Math.floor(Date.now()/1000),
                 recordType: r.disease_category || "Unknown",
                 description: r.disease_name || r.symptoms || "",
                 institution: r.hospital_type || "Unknown",
                 bloodType: r.blood_group || "Unknown",
                 gender: r.gender || "Unknown",
                 patientIndex: r.patient_id || ("MOCK-"+i)
             }));
             const combined = [...recs, ...mockRecs];
             setAnonymizedRecords(combined);
             
             const prof = await contract.read.getResearcherProfile({ account: a });
             setProfile(prev => ({ ...prev, dataAccessCount: Number(prof[5]) }));
             setStatus(`✓ Successfully fetched ${combined.length} anonymized records.`);
             setActiveTab("dataset");
             setDataLoading(false);
          },
          error: async (err) => {
             setAnonymizedRecords(recs);
             const prof = await contract.read.getResearcherProfile({ account: a });
             setProfile(prev => ({ ...prev, dataAccessCount: Number(prof[5]) }));
             setStatus(`✓ Successfully fetched ${recs.length} blockchain records (Mock failed).`);
             setActiveTab("dataset");
             setDataLoading(false);
          }
      });
    } catch (err) {
      setStatus("Error: " + (err.shortMessage || err.message));
      setDataLoading(false);
    }
  }

  function signOut() {
    sessionStorage.setItem("disconnected", "true");
    router.push("/");
  }

  if (loading) return (
    <div style={S.loadPage}>
      <div style={S.spinner}></div>
      <p style={S.loadText}>Loading Researcher Dashboard…</p>
    </div>
  );

  const genderData = demographics?.gender || [];
  const bloodTypeData = (demographics?.bloodTypes || []).filter(b => b.value > 0);
  const recordTypeData = (recordBreakdown || []).filter(r => r.count > 0);
  const timelineData = timeline || [];

  const maxRec = Math.max(...recordTypeData.map(r => r.count), 1);
  const radarData = recordTypeData.map(r => ({ subject: r.name, A: r.count, fullMark: maxRec }));

  const topRecordType = recordTypeData.sort((a, b) => b.count - a.count)[0]?.name || "—";
  const dominantBlood = bloodTypeData.sort((a, b) => b.value - a.value)[0]?.name || "—";
  const totalFemale = genderData.find(g => g.name === "Female")?.value || 0;
  const totalMale   = genderData.find(g => g.name === "Male")?.value || 0;
  const genderRatio = totalMale ? `${((totalFemale / totalMale) * 100).toFixed(0)}%` : "—";

  const tabs = ["overview", "demographics", "records", "timeline", "dataset"];

  return (
    <div style={S.page}>
      <header style={S.topbar}>
        <div style={S.topLeft}>
          <div style={S.logoWrap}>
            <span style={S.logoIcon}>☤</span>
            <div>
              <div style={S.logoTitle}>DPHRS Research</div>
            </div>
          </div>
        </div>
        <div style={S.topRight}>
          {profile && (
            <div style={S.profileChip}>
              <span style={S.profileAvatar}>{profile.name.charAt(0).toUpperCase()}</span>
              <div>
                <div style={S.profileName}>{profile.name}</div>
              </div>
            </div>
          )}
          <button style={S.signoutBtn} onClick={signOut}>Sign Out</button>
        </div>
      </header>

      <main style={S.main}>
        <div style={S.kpiGrid}>
          <StatCard icon="👥" label="Total Patients" value={stats?.totalPatients ?? "—"} sub="Registered" variant="white" />
          <StatCard icon="📋" label="Medical Records" value={stats?.totalRecords ?? "—"} sub="Total in system" variant="dark" />
          <StatCard icon="🏆" label="Top Record Type" value={topRecordType} sub="Most common" variant="lime" />
          <StatCard icon="🩸" label="Dominant Blood" value={dominantBlood} sub="Major group" variant="white" />
          <StatCard icon="📊" label="Access Count" value={profile?.dataAccessCount ?? "—"} sub="Your queries" variant="dark" />
        </div>

        <div style={S.fetchBanner}>
          <div>
            <div style={S.fetchTitle}>Anonymized Patient Dataset</div>
            <div style={S.fetchSub}>Fetch de-identified medical records from the blockchain. Your access will be logged.</div>
          </div>
          <button style={S.fetchBtn} onClick={fetchDataset} disabled={dataLoading}>
            {dataLoading ? "Fetching..." : "Fetch Dataset"}
          </button>
        </div>
        {status && <div style={S.statusBar}>{status}</div>}

        <div style={S.tabRow}>
          {tabs.map(t => (
            <button
              key={t}
              style={activeTab === t ? S.tabActive : S.tab}
              onClick={() => setActiveTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "dataset" && anonymizedRecords.length > 0 && (
                <span style={S.tabBadge}>{anonymizedRecords.length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div style={S.grid2}>
            <div style={S.chartCard}>
              <SectionHeader title="Gender Distribution" description="Breakdown of patients by gender" />
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={genderData.filter(g=>g.value>0)} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                    labelLine={false}>
                    {genderData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "Patients"]} contentStyle={S.tooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={S.chartCard}>
              <SectionHeader title="Blood Type Distribution" description="Number of patients per blood group" />
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bloodTypeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={S.tooltip} />
                  <Bar dataKey="value" name="Patients" radius={[6, 6, 0, 0]} barSize={32}>
                    {bloodTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ ...S.chartCard, gridColumn: "1 / -1" }}>
              <SectionHeader title="Medical Record Types" description="Total count of each record category across all patients" />
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={recordTypeData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={S.tooltip} />
                  <Bar dataKey="count" name="Records" radius={[6, 6, 0, 0]} barSize={40}>
                    {recordTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ ...S.chartCard, gridColumn: "1 / -1" }}>
              <SectionHeader title="Records Added Over Time" description="Monthly record creation trend (last 12 months)" />
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#13544a" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#13544a" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={S.tooltip} />
                  <Area type="monotone" dataKey="records" name="Records" stroke="#13544a" fill="url(#greenGrad)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ... DEMOGRAPHICS ... */}
        {activeTab === "demographics" && (
          <div style={S.grid2}>
            <div style={S.chartCard}>
              <SectionHeader title="Gender Pie Chart" description="Patient gender split" />
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={genderData.filter(g=>g.value>0)} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={65} outerRadius={105}
                    label={({ name, value }) => `${name}: ${value}`}>
                    {genderData.map((_, i) => <Cell key={i} fill={["#256a5c", "#badd93", "#13544a"][i % 3]} />)}
                  </Pie>
                  <Tooltip contentStyle={S.tooltip} />
                  <Legend wrapperStyle={{ color: "#475569", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Omitted other charts for brevity but would style similarly */}
            <div style={S.chartCard}>
              <SectionHeader title="Blood Type Donut" description="Blood group frequency among all patients" />
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={bloodTypeData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={110}
                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                    labelLine={true}>
                    {bloodTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={S.tooltip} />
                  <Legend wrapperStyle={{ color: "#475569", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ... RECORDS ... */}
        {activeTab === "records" && (
           <div style={S.grid2}>
             <div style={S.chartCard}>
               <SectionHeader title="Record Type Breakdown" description="Categories of medical records" />
               <ResponsiveContainer width="100%" height={300}>
                 <PieChart>
                   <Pie data={recordTypeData} dataKey="count" nameKey="name"
                     cx="50%" cy="50%" outerRadius={110}
                     label={({ name, percent }) => `${name.split(" ")[0]} ${(percent*100).toFixed(0)}%`}
                     labelLine={false}>
                     {recordTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                   </Pie>
                   <Tooltip contentStyle={S.tooltip} />
                   <Legend wrapperStyle={{ color: "#475569", fontSize: 12 }} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div style={S.chartCard}>
               <SectionHeader title="Record Radar" description="Relative spread of record types" />
               <ResponsiveContainer width="100%" height={300}>
                 <RadarChart data={radarData}>
                   <PolarGrid stroke="#e2e8f0" />
                   <PolarAngleAxis dataKey="subject" tick={{ fill: "#475569", fontSize: 11 }} />
                   <PolarRadiusAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                   <Radar name="Records" dataKey="A" stroke="#13544a" fill="#13544a" fillOpacity={0.25} />
                   <Legend wrapperStyle={{ color: "#475569", fontSize: 13 }} />
                 </RadarChart>
               </ResponsiveContainer>
             </div>
           </div>
        )}

        {/* ... TIMELINE ... */}
        {activeTab === "timeline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
             <div style={S.chartCard}>
              <SectionHeader title="Monthly Records (Line)" description="Exact values per month" />
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={S.tooltip} />
                  <Line type="monotone" dataKey="records" name="Records Added" stroke="#13544a" strokeWidth={3} dot={{ fill: "#13544a", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={S.chartCard}>
              <SectionHeader title="Monthly Records (Bar)" description="Column chart view of monthly activity" />
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={S.tooltip} />
                  <Bar dataKey="records" name="Records" fill="#badd93" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── DATASET TAB ── */}
        {activeTab === "dataset" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {anonymizedRecords.length === 0 ? (
              <div style={S.emptyDataset}>
                <div style={{ fontSize: "3rem" }}>📭</div>
                <div style={{ fontSize: "1.1rem", color: "#475569" }}>No anonymized data loaded yet.</div>
              </div>
            ) : (
              <>
                <div style={{...S.chartCard, padding: "2rem" }}>
                  <SectionHeader
                    title={`Anonymized Dataset — ${anonymizedRecords.length} Records`}
                    description="Complete de-identified medical history."
                  />
                  <DataTable records={anonymizedRecords} />
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif !important; background: #dee6e5; margin: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

// ── Refined Reference UI Styles ─────────────────────────────────────────────
const S = {
  page: { minHeight: "100vh", background: "#dee6e5", color: "#1e293b", fontFamily: "'Inter', sans-serif" },

  loadPage: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#dee6e5", gap: "1.5rem" },
  spinner: { width: 48, height: 48, border: "4px solid #badd93", borderTop: "4px solid #13544a", borderRadius: "50%", animation: "spin 0.9s linear infinite" },
  loadText: { color: "#475569", fontSize: "1rem", fontWeight: 500 },

  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 2.5rem", background: "transparent" },
  topLeft: { display: "flex", alignItems: "center", gap: "1.5rem" },
  logoWrap: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logoIcon: { fontSize: "2rem", color: "#13544a", fontWeight: "bold" },
  logoTitle: { fontWeight: 700, fontSize: "1.3rem", color: "#1e293b" },
  
  topRight: { display: "flex", alignItems: "center", gap: "1.2rem" },
  profileChip: { display: "flex", alignItems: "center", gap: "0.8rem", background: "#ffffff", padding: "0.3rem 1rem 0.3rem 0.3rem", borderRadius: "999px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
  profileAvatar: { width: 34, height: 34, borderRadius: "50%", background: "#13544a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.95rem", color: "#ffffff" },
  profileName: { fontWeight: 600, fontSize: "0.85rem", color: "#1e293b" },
  signoutBtn: { padding: "0.5rem 1rem", background: "#ffffff", border: "none", color: "#1e293b", borderRadius: "2rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.03)", transition: "all 0.2s" },

  main: { maxWidth: 1200, margin: "0 auto", padding: "1rem 2.5rem 4rem" },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.2rem", marginBottom: "2rem" },
  
  card: { background: "#ffffff", borderRadius: "1.5rem", padding: "1.5rem", display: "flex", alignItems: "center", transition: "transform 0.2s", animation: "fadeIn 0.4s ease", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
  cardDark: { background: "#13544a", borderRadius: "1.5rem", padding: "1.5rem", display: "flex", alignItems: "center", color: "#ffffff", boxShadow: "0 4px 15px rgba(19,84,74,0.12)", animation: "fadeIn 0.4s ease" },
  cardGreen: { background: "#badd93", borderRadius: "1.5rem", padding: "1.5rem", display: "flex", alignItems: "center", color: "#13544a", boxShadow: "0 4px 15px rgba(186,221,147,0.15)", animation: "fadeIn 0.4s ease" },
  
  cardBody: { flex: 1, display: "flex", flexDirection: "column" },
  cardValueRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem" },
  cardValue: { fontSize: "1.8rem", fontWeight: 600, lineHeight: 1 },
  cardIconWrap: { width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" },
  cardLabel: { fontSize: "0.85rem", fontWeight: 500 },
  cardSub: { fontSize: "0.75rem", marginTop: "0.3rem" },

  fetchBanner: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", background: "#ffffff", borderRadius: "1.5rem", padding: "1.8rem 2rem", marginBottom: "1.2rem", flexWrap: "wrap", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
  fetchTitle: { fontWeight: 600, fontSize: "1.1rem", color: "#1e293b", marginBottom: "0.4rem" },
  fetchSub: { fontSize: "0.85rem", color: "#64748b", maxWidth: "600px" },
  fetchBtn: { padding: "0.8rem 1.8rem", background: "#13544a", color: "#ffffff", border: "none", borderRadius: "2rem", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", transition: "transform 0.2s" },

  statusBar: { background: "#badd93", borderRadius: "1rem", padding: "0.8rem 1.5rem", fontSize: "0.85rem", color: "#13544a", fontWeight: 500, marginBottom: "1.5rem", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },

  tabRow: { display: "flex", gap: "0.8rem", marginBottom: "1.5rem", overflowX: "auto" },
  tab: { padding: "0.6rem 1.3rem", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500, borderRadius: "2rem", transition: "all 0.2s", whiteSpace: "nowrap" },
  tabActive: { padding: "0.6rem 1.3rem", background: "#ffffff", border: "none", color: "#13544a", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, borderRadius: "2rem", whiteSpace: "nowrap", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" },
  tabBadge: { marginLeft: "0.5rem", background: "#badd93", color: "#13544a", fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px" },

  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem" },

  chartCard: { background: "#ffffff", border: "none", borderRadius: "1.8rem", padding: "1.8rem", animation: "fadeIn 0.4s ease", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },

  sectionHeader: { marginBottom: "1.5rem" },
  sectionTitle: { fontWeight: 600, fontSize: "1.05rem", color: "#1e293b", margin: 0 },
  sectionDesc: { fontSize: "0.8rem", color: "#64748b", marginTop: "0.3rem" },

  tooltip: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "0.8rem", color: "#1e293b", fontSize: "0.85rem", boxShadow: "0 8px 25px rgba(0,0,0,0.08)", padding: "0.5rem 0.8rem" },

  emptyDataset: { background: "#ffffff", borderRadius: "1.8rem", padding: "5rem 2rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },

  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" },
  th: { padding: "1rem", color: "#64748b", fontWeight: 500, textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" },
  trElement: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "1rem", color: "#334155", whiteSpace: "nowrap" },
  pid: { fontFamily: "monospace", fontSize: "0.82rem", color: "#13544a", fontWeight: 500, background: "#f1f5f9", padding: "0.2rem 0.4rem", borderRadius: "0.4rem" },
  badge: { padding: "0.25rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, color: "#fff" },
  genderBadge: { padding: "0.25rem 0.6rem", borderRadius: "0.4rem", fontSize: "0.75rem", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" },
  recTypeBadge: { padding: "0.25rem 0.6rem", borderRadius: "0.4rem", fontSize: "0.75rem", background: "#badd93", color: "#13544a", fontWeight: 500 },

  pagRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginTop: "1.5rem" },
  pagBtn: { padding: "0.5rem 1rem", background: "#ffffff", border: "1px solid #e2e8f0", color: "#475569", borderRadius: "2rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 },
  pagInfo: { fontSize: "0.85rem", color: "#64748b" },
};

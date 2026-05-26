import { useState, useEffect, useRef } from "react";

const API = "https://api.nij-begun.project.abl.nu/api/v1";

// ── helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path) {
  const r = await fetch(`${API}${path}`, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`API fout ${r.status}`);
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.errors?.[0]?.detail?.message || `API fout ${r.status}`);
  }
  return r.json();
}

// ── main component ────────────────────────────────────────────────────────────

export default function App() {
  const [measures, setMeasures] = useState([]);       // all from API
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [klant, setKlant] = useState("");
  const [adres, setAdres] = useState("");
  const [type, setType] = useState("contractor");     // diy | contractor

  const [selected, setSelected] = useState({});       // { code: quantity }
  const [zoek, setZoek] = useState("");
  const [activeTab, setActiveTab] = useState("catalog");

  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(null);

  const [pdfLoading, setPdfLoading] = useState(false);
  const fileRef = useRef();

  // ── load catalog ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [mRes, cRes] = await Promise.all([
          apiFetch("/measures"),
          apiFetch("/categories"),
        ]);
        setMeasures(mRes.data || []);
        setCategories(cRes.data || []);
      } catch (e) {
        setApiError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── derived ─────────────────────────────────────────────────────────────────
  const selectedCodes = Object.keys(selected);
  const selectedMeasures = measures.filter(m => selected[m.id] !== undefined);

  const filtered = measures.filter(m => {
    const q = zoek.toLowerCase();
    return (
      m.id.toLowerCase().includes(q) ||
      m.attributes.name.toLowerCase().includes(q) ||
      m.attributes.category?.attributes?.name?.toLowerCase().includes(q) ||
      m.attributes.subcategory?.attributes?.name?.toLowerCase().includes(q)
    );
  });

  // group filtered by category
  const grouped = {};
  filtered.forEach(m => {
    const cat = m.attributes.category?.attributes?.name || "Overig";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  });

  // ── actions ─────────────────────────────────────────────────────────────────
  const toggle = (code) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[code] !== undefined) delete next[code];
      else next[code] = 1;
      return next;
    });
    setCalcResult(null);
  };

  const setQty = (code, val) => {
    setSelected(prev => ({ ...prev, [code]: Math.max(0, Number(val)) }));
    setCalcResult(null);
  };

  const calculate = async () => {
    if (!selectedCodes.length) return;
    setCalcLoading(true);
    setCalcError(null);
    try {
      const body = {
        type,
        measures: selectedCodes.map(code => ({ code, quantity: selected[code] || 0 })),
      };
      const res = await apiPost("/measures/subsidies", body);
      setCalcResult(res);
      setActiveTab("results");
    } catch (e) {
      setCalcError(e.message);
    } finally {
      setCalcLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!selectedCodes.length) return;
    setPdfLoading(true);
    try {
      const body = {
        type,
        measures: selectedCodes.map(code => ({ code, quantity: selected[code] || 0 })),
      };
      const r = await fetch(`${API}/measures/generate_pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("PDF genereren mislukt");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subsidieadvies-${klant.replace(/\s+/g, "-") || "klant"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("PDF fout: " + e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.trim().split("\n").slice(1);
      const next = { ...selected };
      lines.forEach(line => {
        const [code, qty] = line.split(/[,;]/).map(s => s.trim());
        if (code) next[code] = parseFloat(qty) || 1;
      });
      setSelected(next);
      setCalcResult(null);
      setActiveTab("catalog");
    };
    reader.readAsText(file);
  };

  // ── totals from calcResult ───────────────────────────────────────────────
  const totalCost = calcResult?.meta?.totalCost ?? null;

  // ── color map for categories ─────────────────────────────────────────────
  const CAT_COLORS = ["#1B4D3E","#2D6A4F","#1B4372","#6B2D8B","#B7580B","#8B2D2D","#2D6B8B"];
  const catColor = (name) => {
    const idx = categories.findIndex(c => c.attributes.name === name);
    return CAT_COLORS[idx % CAT_COLORS.length] || "#444";
  };

  // ── render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f0f4f0", flexDirection:"column", gap:16 }}>
      <div style={{ width:48, height:48, border:"4px solid #2D6A4F", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <div style={{ color:"#2D6A4F", fontFamily:"sans-serif", fontWeight:600 }}>Maatregelcatalogus laden…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (apiError) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#fff5f5", flexDirection:"column", gap:12, fontFamily:"sans-serif" }}>
      <div style={{ fontSize:40 }}>⚠️</div>
      <div style={{ fontWeight:700, color:"#c0392b" }}>API niet bereikbaar</div>
      <div style={{ color:"#666", fontSize:13 }}>{apiError}</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f1", fontFamily:"'Segoe UI', system-ui, sans-serif", color:"#1a1a2e" }}>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(135deg,#0d2e1f 0%,#1B4D3E 50%,#2D6A4F 100%)", color:"white", padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 24px rgba(0,0,0,0.25)" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.5px" }}>🏠 Nij Begun Subsidieadviseur</div>
          <div style={{ fontSize:11, opacity:0.65, marginTop:2 }}>{measures.length} maatregelen geladen via live API</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {/* type toggle */}
          <div style={{ display:"flex", background:"rgba(255,255,255,0.12)", borderRadius:8, overflow:"hidden", border:"1px solid rgba(255,255,255,0.2)" }}>
            {[["diy","Doe-het-zelf"],["contractor","Aannemer"]].map(([v,label]) => (
              <button key={v} onClick={() => { setType(v); setCalcResult(null); }} style={{ padding:"7px 14px", border:"none", background: type===v ? "rgba(255,255,255,0.25)" : "transparent", color:"white", fontSize:12, fontWeight: type===v ? 700 : 400, cursor:"pointer" }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => fileRef.current.click()} style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", color:"white", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600 }}>
            📂 CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }} onChange={handleCSV} />
          <button
            onClick={downloadPDF}
            disabled={!selectedCodes.length || pdfLoading}
            style={{ background: selectedCodes.length ? "#95D5B2" : "#555", border:"none", color: selectedCodes.length ? "#0d2e1f" : "#999", padding:"7px 18px", borderRadius:8, cursor: selectedCodes.length ? "pointer" : "not-allowed", fontSize:12, fontWeight:800 }}
          >
            {pdfLoading ? "Bezig…" : "📄 PDF"}
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", minHeight:"calc(100vh - 60px)" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ padding:"20px 24px", overflow:"auto" }}>

          {/* klantgegevens */}
          <div style={{ background:"white", borderRadius:12, padding:"16px 20px", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.07)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>Naam klant</label>
              <input value={klant} onChange={e => setKlant(e.target.value)} placeholder="Jan de Vries" style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #dde", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>Adres</label>
              <input value={adres} onChange={e => setAdres(e.target.value)} placeholder="Straat 1, 1234 AB Stad" style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #dde", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>
          </div>

          {/* tabs */}
          <div style={{ display:"flex", gap:4, marginBottom:16 }}>
            {[["catalog", `📋 Catalogus (${measures.length})`], ["results", `📊 Resultaat${calcResult ? ` · €${totalCost?.toLocaleString("nl-NL",{minimumFractionDigits:2})}` : ""}`]].map(([t, label]) => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:600, fontSize:12, background: activeTab===t ? "#1B4D3E" : "white", color: activeTab===t ? "white" : "#555", boxShadow: activeTab===t ? "0 2px 8px rgba(27,77,62,0.3)" : "0 1px 3px rgba(0,0,0,0.08)" }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── CATALOG TAB ── */}
          {activeTab === "catalog" && (
            <>
              <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="🔍 Zoek op naam, code, categorie…"
                style={{ width:"100%", padding:"10px 16px", border:"1.5px solid #dde", borderRadius:10, fontSize:13, marginBottom:16, outline:"none", background:"white", boxSizing:"border-box" }} />

              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom:18 }}>
                  <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", color: catColor(cat), marginBottom:8, paddingLeft:4, display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:10, height:10, borderRadius:2, background: catColor(cat), display:"inline-block" }} />
                    {cat} <span style={{ fontWeight:400, opacity:0.6 }}>({items.length})</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {items.map(m => {
                      const isSelected = selected[m.id] !== undefined;
                      const attrs = m.attributes;
                      const cost = attrs.regularCosts?.[0]?.attributes;
                      const unitCost = type === "diy" ? cost?.diyValuePerUnit : cost?.contractorValuePerUnit;
                      return (
                        <div key={m.id} onClick={() => toggle(m.id)} style={{ background: isSelected ? "#eef8f2" : "white", border: isSelected ? `2px solid ${catColor(cat)}` : "1.5px solid #e8eae8", borderRadius:10, padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"all 0.12s" }}>
                          {/* checkbox */}
                          <div style={{ width:20, height:20, borderRadius:5, border: isSelected ? `2px solid ${catColor(cat)}` : "2px solid #ccc", background: isSelected ? catColor(cat) : "white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, color:"white", fontWeight:800 }}>
                            {isSelected ? "✓" : ""}
                          </div>
                          {/* info */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:600, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{attrs.name}</div>
                            <div style={{ fontSize:10, color:"#999", marginTop:2, display:"flex", gap:10 }}>
                              <span>{m.id}</span>
                              {attrs.rcValue && <span>RC {attrs.rcValue}</span>}
                              {attrs.thicknessInMm && <span>{attrs.thicknessInMm}mm</span>}
                              {attrs.isBiobased && <span style={{ color:"#2D6A4F", fontWeight:700 }}>🌿 biobased</span>}
                              {unitCost != null && <span style={{ color:"#555" }}>€{unitCost}/{attrs.unit}</span>}
                            </div>
                          </div>
                          {/* qty input */}
                          {isSelected && (
                            <div onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                              <input type="number" min="0" value={selected[m.id] ?? ""} onChange={e => setQty(m.id, e.target.value)}
                                style={{ width:65, padding:"5px 8px", border:`1.5px solid ${catColor(cat)}`, borderRadius:6, fontSize:13, textAlign:"right", outline:"none" }} />
                              <span style={{ fontSize:10, color:"#888", width:24 }}>{attrs.unit}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── RESULTS TAB ── */}
          {activeTab === "results" && (
            <>
              {!calcResult && !calcLoading && (
                <div style={{ textAlign:"center", padding:"60px 20px", color:"#bbb" }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
                  <div style={{ fontSize:14, fontWeight:600 }}>Selecteer maatregelen en klik op <strong style={{ color:"#1B4D3E" }}>Bereken</strong></div>
                </div>
              )}
              {calcLoading && (
                <div style={{ textAlign:"center", padding:"60px 20px", color:"#2D6A4F" }}>
                  <div style={{ width:40, height:40, border:"4px solid #2D6A4F", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }} />
                  <div>Subsidie berekenen via API…</div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              {calcError && (
                <div style={{ background:"#fff0f0", border:"1px solid #f5c6c6", borderRadius:10, padding:"14px 18px", color:"#c0392b", fontSize:13, marginBottom:16 }}>
                  ⚠️ {calcError}
                </div>
              )}
              {calcResult && (
                <div style={{ background:"white", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ background:"#1B4D3E", color:"white" }}>
                        {["Maatregel","Hoeveelheid","Per eenheid","Subtotaal"].map(h => (
                          <th key={h} style={{ padding:"10px 14px", textAlign: h==="Maatregel" ? "left" : "right", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {calcResult.data.map((row, i) => (
                        <tr key={row.id} style={{ borderBottom:"1px solid #eef2ee", background: i%2===0 ? "#fafcfa" : "white" }}>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ fontWeight:600, fontSize:13 }}>{row.attributes.name}</div>
                            <div style={{ fontSize:10, color:"#aaa" }}>{row.id}</div>
                          </td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13 }}>{row.attributes.quantity} {row.attributes.unit}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13 }}>€ {row.attributes.unitCost?.toFixed(2)}</td>
                          <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:700, fontSize:14, color:"#1B4D3E" }}>€ {row.attributes.totalForQuantity?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{ background:"white", borderLeft:"1px solid #e0e8e0", padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", color:"#2D6A4F" }}>Overzicht</div>

          {/* totaal box */}
          <div style={{ background:"linear-gradient(135deg,#0d2e1f,#1B4D3E)", color:"white", borderRadius:12, padding:"18px 20px" }}>
            <div style={{ fontSize:10, opacity:0.7, marginBottom:4 }}>
              {calcResult ? "Berekend subsidiebedrag" : "Geselecteerde maatregelen"}
            </div>
            {calcResult ? (
              <div style={{ fontSize:30, fontWeight:800, letterSpacing:"-1px" }}>
                € {totalCost?.toLocaleString("nl-NL", { minimumFractionDigits:2 })}
              </div>
            ) : (
              <div style={{ fontSize:30, fontWeight:800 }}>{selectedCodes.length}</div>
            )}
            <div style={{ fontSize:10, opacity:0.6, marginTop:4 }}>
              {calcResult ? `Type: ${calcResult.meta?.type === "diy" ? "Doe-het-zelf" : "Aannemer"}` : `${selectedCodes.length} maatregel${selectedCodes.length!==1?"en":""}`}
            </div>
          </div>

          {/* selected list */}
          {selectedMeasures.length > 0 && (
            <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", gap:6 }}>
              {selectedMeasures.map(m => {
                const catName = m.attributes.category?.attributes?.name || "Overig";
                const resultRow = calcResult?.data?.find(r => r.id === m.id);
                return (
                  <d

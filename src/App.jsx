import { useState, useEffect, useRef } from "react";

const API = "https://api.nij-begun.project.abl.nu/api/v1";

const TRIPLE_GLAS_KEYWORDS = ["triple", "drievoudig", "3-voudig", "hr+++"];

const isTripleGlas = (measure) => {
  const name = measure.attributes.name.toLowerCase();
  const subcat = measure.attributes.subcategory?.attributes?.name?.toLowerCase() || "";
  return TRIPLE_GLAS_KEYWORDS.some(k => name.includes(k) || subcat.includes(k));
};

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

export default function App() {
  const [measures, setMeasures] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [klant, setKlant] = useState("");
  const [adres, setAdres] = useState("");
  const [postcode, setPostcode] = useState("");
  const [type, setType] = useState("contractor");
  const [regeling, setRegeling] = useState(null);
  const [selected, setSelected] = useState({});
  const [zoek, setZoek] = useState("");
  const [activeTab, setActiveTab] = useState("catalog");
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const fileRef = useRef();

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

  const selectedCodes = Object.keys(selected);

  const hasTripleGlas = selectedCodes.some(code => {
    const m = measures.find(x => x.id === code);
    return m && isTripleGlas(m);
  });

  const effectiveRegeling = hasTripleGlas ? "triple30" : regeling;
  const subsidiePercentage = effectiveRegeling === "triple30" ? 30
    : effectiveRegeling === "standaard50" ? 50
    : effectiveRegeling === "standaard100" ? 100
    : null;

  const selectedMeasures = measures.filter(m => {
    if (selected[m.id] === undefined) return false;
    if (hasTripleGlas && !isTripleGlas(m)) return false;
    return true;
  });

  const filtered = measures.filter(m => {
    const q = zoek.toLowerCase();
    return (
      m.id.toLowerCase().includes(q) ||
      m.attributes.name.toLowerCase().includes(q) ||
      m.attributes.category?.attributes?.name?.toLowerCase().includes(q) ||
      m.attributes.subcategory?.attributes?.name?.toLowerCase().includes(q)
    );
  });

  const grouped = {};
  filtered.forEach(m => {
    const cat = m.attributes.category?.attributes?.name || "Overig";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  });

  const CAT_COLORS = ["#1B4D3E","#2D6A4F","#1B4372","#6B2D8B","#B7580B","#8B2D2D","#2D6B8B"];
  const catColor = (name) => {
    const idx = categories.findIndex(c => c.attributes.name === name);
    return CAT_COLORS[idx % CAT_COLORS.length] || "#444";
  };

  const toggle = (code) => {
    const m = measures.find(x => x.id === code);
    const isTriple = m && isTripleGlas(m);
    setSelected(prev => {
      const next = { ...prev };
      if (next[code] !== undefined) {
        delete next[code];
      } else {
        if (isTriple) {
          Object.keys(next).forEach(k => {
            const existing = measures.find(x => x.id === k);
            if (existing && !isTripleGlas(existing)) delete next[k];
          });
        }
        if (!isTriple) {
          Object.keys(next).forEach(k => {
            const existing = measures.find(x => x.id === k);
            if (existing && isTripleGlas(existing)) delete next[k];
          });
        }
        next[code] = 1;
      }
      return next;
    });
    setCalcResult(null);
  };

  const setQty = (code, val) => {
    setSelected(prev => ({ ...prev, [code]: Math.max(0, Number(val)) }));
    setCalcResult(null);
  };

  const calculate = async () => {
    if (!selectedMeasures.length) return;
    setCalcLoading(true);
    setCalcError(null);
    try {
      const body = {
        type,
        measures: selectedMeasures.map(m => ({ code: m.id, quantity: selected[m.id] || 0 })),
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
    if (!selectedMeasures.length) return;
    setPdfLoading(true);
    try {
      const body = {
        type,
        measures: selectedMeasures.map(m => ({ code: m.id, quantity: selected[m.id] || 0 })),
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
      const next = {};
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

  const totalCost = calcResult?.meta?.totalCost ?? null;
  const subsidieBedrag = totalCost != null && subsidiePercentage != null
    ? (totalCost * subsidiePercentage) / 100
    : null;
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
      <div style={{ background:"linear-gradient(135deg,#0d2e1f 0%,#1B4D3E 50%,#2D6A4F 100%)", color:"white", padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 24px rgba(0,0,0,0.25)" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.5px" }}>🏠 Nij Begun Subsidieadviseur</div>
          <div style={{ fontSize:11, opacity:0.65, marginTop:2 }}>{measures.length} maatregelen geladen via live API</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
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
          <button onClick={downloadPDF} disabled={!selectedMeasures.length || pdfLoading} style={{ background: selectedMeasures.length ? "#95D5B2" : "#555", border:"none", color: selectedMeasures.length ? "#0d2e1f" : "#999", padding:"7px 18px", borderRadius:8, cursor: selectedMeasures.length ? "pointer" : "not-allowed", fontSize:12, fontWeight:800 }}>
            {pdfLoading ? "Bezig…" : "📄 PDF"}
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", minHeight:"calc(100vh - 60px)" }}>
        <div style={{ padding:"20px 24px", overflow:"auto" }}>

          <div style={{ background:"white", borderRadius:12, padding:"16px 20px", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"#2D6A4F", marginBottom:12 }}>Klantgegevens</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 140px", gap:12 }}>
              <div>
                <label style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>Naam klant</label>
                <input value={klant} onChange={e => setKlant(e.target.value)} placeholder="Jan de Vries" style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #dde", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>Adres</label>
                <input value={adres} onChange={e => setAdres(e.target.value)} placeholder="Straat 1, 1234 AB Stad" style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #dde", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ fontSize:10, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:4 }}>Postcode</label>
                <input value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="9700 AB" style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #dde", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box" }} />
              </div>
            </div>
          </div>

          {!hasTripleGlas && (
            <div style={{ background:"white", borderRadius:12, padding:"16px 20px", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"#2D6A4F", marginBottom:12 }}>Regeling</div>
              <div style={{ display:"flex", gap:8 }}>
                {[["standaard50","50% regeling","#1B4D3E"],["standaard100","100% regeling","#1B4372"]].map(([v,label,color]) => (
                  <button key={v} onClick={() => setRegeling(v)} style={{ flex:1, padding:"10px", borderRadius:10, border: regeling===v ? `2px solid ${color}` : "1.5px solid #dde", background: regeling===v ? color : "white", color: regeling===v ? "white" : "#555", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasTripleGlas && (
            <div style={{ background:"#fff8e1", border:"1.5px solid #f0c040", borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:24 }}>🪟</div>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:"#7d5a00" }}>Triple glas regeling actief — 30%</div>
                <div style={{ fontSize:11, color:"#9a7000", marginTop:2 }}>Alleen triple glas maatregelen worden meegenomen. Andere maatregelen zijn uitgeschakeld.</div>
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:4, marginBottom:16 }}>
            {[["catalog",`📋 Catalogus (${measures.length})`],["results",`📊 Resultaat${subsidieBedrag != null ? ` · €${subsidieBedrag.toLocaleString("nl-NL",{minimumFractionDigits:2})}` : ""}`]].map(([t,label]) => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:600, fontSize:12, background: activeTab===t ? "#1B4D3E" : "white", color: activeTab===t ? "white" : "#555", boxShadow: activeTab===t ? "0 2px 8px rgba(27,77,62,0.3)" : "0 1px 3px rgba(0,0,0,0.08)" }}>
                {label}
              </button>
            ))}
          </div>

          {activeTab === "catalog" && (
            <>
              <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="🔍 Zoek op naam, code, categorie…" style={{ width:"100%", padding:"10px 16px", border:"1.5px solid #dde", borderRadius:10, fontSize:13, marginBottom:16, outline:"none", background:"white", boxSizing:"border-box" }} />
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom:18 }}>
                  <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", color: catColor(cat), marginBottom:8, paddingLeft:4, display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ width:10, height:10, borderRadius:2, background: catColor(cat), display:"inline-block" }} />
                    {cat} <span style={{ fontWeight:400, opacity:0.6 }}>({items.length})</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {items.map(m => {
                      const isSelected = selected[m.id] !== undefined;
                      const isTriple = isTripleGlas(m);
                      const isDisabled = hasTripleGlas && !isTriple;
                      const attrs = m.attributes;
                      const cost = attrs.regularCosts?.[0]?.attributes;
                      const unitCost = type === "diy" ? cost?.diyValuePerUnit : cost?.contractorValuePerUnit;
                      return (
                        <div key={m.id} onClick={() => !isDisabled && toggle(m.id)} style={{ background: isDisabled ? "#f5f5f5" : isSelected ? "#eef8f2" : "white", border: isSelected ? `2px solid ${catColor(cat)}` : "1.5px solid #e8eae8", borderRadius:10, padding:"10px 14px", cursor: isDisabled ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:12, transition:"all 0.12s", opacity: isDisabled ? 0.4 : 1 }}>
                          <div style={{ width:20, height:20, borderRadius:5, border: isSelected ? `2px solid ${catColor(cat)}` : "2px solid #ccc", background: isSelected ? catColor(cat) : "white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, color:"white", fontWeight:800 }}>
                            {isSelected ? "✓" : ""}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:600, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"flex", alignItems:"center", gap:6 }}>
                              {attrs.name}
                              {isTriple && <span style={{ fontSize:9, background:"#fff8e1", color:"#7d5a00", border:"1px solid #f0c040", borderRadius:4, padding:"1px 5px", fontWeight:700 }}>30%</span>}
                            </div>
                            <div style={{ fontSize:10, color:"#999", marginTop:2, display:"flex", gap:10 }}>
                              <span>{m.id}</span>
                              {attrs.rcValue && <span>RC {attrs.rcValue}</span>}
                              {attrs.thicknessInMm && <span>{attrs.thicknessInMm}mm</span>}
                              {attrs.isBiobased && <span style={{ color:"#2D6A4F", fontWeight:700 }}>🌿 biobased</span>}
                              {unitCost != null && <span style={{ color:"#555" }}>€{unitCost}/{attrs.unit}</span>}
                            </div>
                          </div>
                          {isSelected && (
                            <div onClick={e => e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                              <input type="number" min="0" value={selected[m.id] ?? ""} onChange={e => setQty(m.id, e.target.value)} style={{ width:65, padding:"5px 8px", border:`1.5px solid ${catColor(cat)}`, borderRadius:6, fontSize:13, textAlign:"right", outline:"none" }} />
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
                <>
                  {subsidieBedrag != null && (
                    <div style={{ background: hasTripleGlas ? "linear-gradient(135deg,#7d5a00,#c49a00)" : "linear-gradient(135deg,#0d2e1f,#1B4D3E)", color:"white", borderRadius:12, padding:"16px 20px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:11, opacity:0.75 }}>Subsidiebedrag ({subsidiePercentage}% van cataloguswaarde)</div>
                        <div style={{ fontSize:11, opacity:0.6, marginTop:2 }}>Cataloguswaarde: € {totalCost?.toLocaleString("nl-NL",{minimumFractionDigits:2})}</div>
                      </div>
                      <div style={{ fontSize:28, fontWeight:800 }}>€ {subsidieBedrag.toLocaleString("nl-NL",{minimumFractionDigits:2})}</div>
                    </div>
                  )}
                  <div style={{ background:"white", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ background:"#1B4D3E", color:"white" }}>
                          {["Maatregel","Hoeveelheid","Cataloguswaarde","Subsidie"].map(h => (
                            <th key={h} style={{ padding:"10px 14px", textAlign: h==="Maatregel" ? "left" : "right", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {calcResult.data.map((row, i) => {
                          const subsidie = subsidiePercentage != null ? (row.attributes.totalForQuantity * subsidiePercentage) / 100 : null;
                          return (
                            <tr key={row.id} style={{ borderBottom:"1px solid #eef2ee", background: i%2===0 ? "#fafcfa" : "white" }}>
                              <td style={{ padding:"10px 14px" }}>
                                <div style={{ fontWeight:600, fontSize:13 }}>{row.attributes.name}</div>
                                <div style={{ fontSize:10, color:"#aaa" }}>{row.id}</div>
                              </td>
                              <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13 }}>{row.attributes.quantity} {row.attributes.unit}</td>
                              <td style={{ padding:"10px 14px", textAlign:"right", fontSize:13 }}>€ {row.attributes.totalForQuantity?.toFixed(2)}</td>
                              <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:700, fontSize:14, color: hasTripleGlas ? "#7d5a00" : "#1B4D3E" }}>
                                {subsidie != null ? `€ ${subsidie.toFixed(2)}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div style={{ background:"white", borderLeft:"1px solid #e0e8e0", padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", color:"#2D6A4F" }}>Overzicht</div>
          <div style={{ borderRadius:10, padding:"12px 14px", background: hasTripleGlas ? "#fff8e1" : effectiveRegeling === "standaard100" ? "#e8f0fe" : effectiveRegeling === "standaard50" ? "#eef8f2" : "#f5f5f5", border: hasTripleGlas ? "1.5px solid #f0c040" : effectiveRegeling ? "1.5px solid #2D6A4F" : "1.5px solid #ddd" }}>
            <div style={{ fontSize:10, color:"#888", marginBottom:4 }}>Actieve regeling</div>
            <div style={{ fontWeight:800, fontSize:15, color: hasTripleGlas ? "#7d5a00" : effectiveRegeling ? "#1B4D3E" : "#bbb" }}>
              {hasTripleGlas ? "🪟 Triple glas — 30%" : effectiveRegeling === "standaard100" ? "✅ 100% regeling" : effectiveRegeling === "standaard50" ? "✅ 50% regeling" : "Nog niet gekozen"}
            </div>
            {postcode && <div style={{ fontSize:11, color:"#888", marginTop:4 }}>📍 {postcode}</div>}
          </div>

          <div style={{ background:"linear-gradient(135deg,#0d2e1f,#1B4D3E)", color:"white", borderRadius:12, padding:"18px 20px" }}>
            <div style={{ fontSize:10, opacity:0.7, marginBottom:4 }}>
              {subsidieBedrag != null ? `Subsidie (${subsidiePercentage}%)` : calcResult ? "Cataloguswaarde" : "Geselecteerd"}
            </div>
            <div style={{ fontSize:28, fontWeight:800, letterSpacing:"-1px" }}>
              {subsidieBedrag != null
                ? `€ ${subsidieBedrag.toLocaleString("nl-NL",{minimumFractionDigits:2})}`
                : totalCost != null
                ? `€ ${totalCost.toLocaleString("nl-NL",{minimumFractionDigits:2})}`
                : selectedMeasures.length}
            </div>
            <div style={{ fontSize:10, opacity:0.6, marginTop:4 }}>
              {subsidieBedrag != null ? `Cataloguswaarde: € ${totalCost?.toLocaleString("nl-NL",{minimumFractionDigits:2})}` : `${selectedMeasures.length} maatregel${selectedMeasures.length!==1?"en":""}`}
            </div>
          </div>

          {selectedMeasures.length > 0 && (
            <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", gap:6 }}>
              {selectedMeasures.map(m => {
                const catName = m.attributes.category?.attributes?.name || "Overig";
                const resultRow = calcResult?.data?.find(r => r.id === m.id);
                const subsidie = resultRow && subsidiePercentage ? (resultRow.attributes.totalForQuantity * subsidiePercentage) / 100 : null;
                return (
                  <div key={m.id} style={{ padding:"8px 12px", borderRadius:8, background:"#f4f9f5", borderLeft:`3px solid ${catColor(catName)}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{m.attributes.name}</div>
                      <div style={{ fontSize:10, color:"#aaa" }}>{m.id} · {selected[m.id]} {m.attributes.unit}</div>
                    </div>
                    {subsidie != null && (
                      <div style={{ fontSize:13, fontWeight:700, color:"#1B4D3E", marginLeft:8, flexShrink:0 }}>
                        €{subsidie.toFixed(0)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedMeasures.length === 0 && (
            <div style={{ color:"#ccc", fontSize:12, textAlign:"center", padding:"20px 0" }}>
              Selecteer maatregelen uit de catalogus
            </div>
          )}

          <div style={{ marginTop:"auto", display:"flex", flexDirection:"column", gap:8 }}>
            {!hasTripleGlas && !regeling && selectedMeasures.length > 0 && (
              <div style={{ fontSize:11, color:"#e67e22", textAlign:"center", background:"#fff8f0", padding:"8px", borderRadius:8 }}>
                ⚠️ Kies eerst een regeling (50% of 100%)
              </div>
            )}
            {calcError && <div style={{ fontSize:11, color:"#e74c3c", textAlign:"center" }}>{calcError}</div>}
            <button onClick={calculate} disabled={!selectedMeasures.length || calcLoading || (!hasTripleGlas && !regeling)} style={{ background: selectedMeasures.length && (hasTripleGlas || regeling) ? "#2D6A4F" : "#ddd", color: selectedMeasures.length && (hasTripleGlas || regeling) ? "white" : "#aaa", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor: selectedMeasures.length && (hasTripleGlas || regeling) ? "pointer" : "not-allowed", width:"100%" }}>
              {calcLoading ? "Berekenen…" : `🧮 Bereken subsidie (${selectedMeasures.length})`}
            </button>
            <button onClick={downloadPDF} disabled={!selectedMeasures.length || pdfLoading} style={{ background: selectedMeasures.length ? "#0d2e1f" : "#ddd", color: selectedMeasures.length ? "white" : "#aaa", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor: selectedMeasures.length ? "pointer" : "not-allowed", width:"100%" }}>
              {pdfLoading ? "PDF maken…" : "📄 PDF downloaden"}
            </button>
            <div style={{ background:"#fffbf0", borderRadius:8, padding:"12px 14px", border:"1px solid #f0e0a0" }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#856404", marginBottom:4 }}>ℹ️ Let op</div>
              <div style={{ fontSize:10, color:"#666", lineHeight:1.6 }}>
                Bedragen zijn indicatief op basis van de Nij Begun Maatregelcatalogus. Definitieve subsidie wordt vastgesteld door SNN/RVO.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
            }

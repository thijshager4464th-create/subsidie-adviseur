import { useState, useEffect } from "react";

const API = "https://api.nij-begun.project.abl.nu/api/v1";
const PREFIXES_30 = ["V2-4", "V4-1-I"];
const PREFIXES_50 = ["V2-1", "V2-2", "V2-3", "V4-3", "V4-4", "V6-1-C", "V6-1-D"];
const is30 = (id) => PREFIXES_30.some(p => id.startsWith(p));
const is50 = (id) => PREFIXES_50.some(p => id.startsWith(p));
const isSchipper = (id) => is30(id) || is50(id);

async function apiFetch(path) {
  const r = await fetch(API + path, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("API fout " + r.status);
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.errors?.[0]?.detail?.message || "API fout " + r.status);
  }
  return r.json();
}

function Kaart({ id, name, unit, unitCost, isSelected, onToggle, onQtyChange, qty, color }) {
  return (
    <div onClick={() => onToggle(id)} style={{ background: isSelected ? "#eef8f2" : "white", border: isSelected ? "2px solid " + color : "1.5px solid #e8eae8", borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.12s" }}>
      <div style={{ width: 20, height: 20, borderRadius: 5, border: isSelected ? "2px solid " + color : "2px solid #ccc", background: isSelected ? color : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: "white", fontWeight: 800 }}>
        {isSelected ? "v" : ""}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ fontSize: 10, color: "#999", marginTop: 2, display: "flex", gap: 10 }}>
          <span style={{ fontWeight: 700 }}>{id}</span>
          {unitCost != null && unitCost > 0 && <span>{"€ " + unitCost + " / " + unit}</span>}
        </div>
      </div>
      {isSelected && (
        <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <input type="number" min="0" value={qty ?? ""} onChange={e => onQtyChange(id, e.target.value)} style={{ width: 65, padding: "5px 8px", border: "1.5px solid " + color, borderRadius: 6, fontSize: 13, textAlign: "right", outline: "none" }} />
          <span style={{ fontSize: 10, color: "#888", width: 24 }}>{unit}</span>
        </div>
      )}
    </div>
  );
}

function printPDF(klant, adres, postcode, pct, cat50, addTotaal, subsidie, offerte, bovenCat, eigenBijdrage, rows, addRows, datum) {
  const rHTML = rows.map(r => "<tr><td>" + r.id + "</td><td>" + r.attributes.name + "</td><td style='text-align:right'>" + r.attributes.quantity + " " + r.attributes.unit + "</td><td style='text-align:right'>€ " + r.attributes.totalForQuantity.toFixed(2) + "</td><td style='text-align:right'>€ " + (r.attributes.totalForQuantity * pct / 100).toFixed(2) + "</td></tr>").join("");
  const aHTML = addRows.map(r => "<tr style='background:#f9f9f9'><td>" + r.id + "</td><td>" + r.name + "</td><td style='text-align:right'>" + r.qty + " " + r.unit + "</td><td style='text-align:right'>€ " + r.subtotaal.toFixed(2) + "</td><td style='text-align:right'>€ " + (r.subtotaal * pct / 100).toFixed(2) + "</td></tr>").join("");
  const bHTML = bovenCat > 0 ? "<tr style='color:#c0392b'><td colspan='4'>Boven catalogusmaximum (eigen rekening, niet subsidiabel)</td><td style='text-align:right'>€ " + bovenCat.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</td></tr>" : "";
  const win = window.open("", "_blank");
  win.document.write("<!DOCTYPE html><html lang='nl'><head><meta charset='UTF-8'><title>Subsidieoverzicht</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Segoe UI,sans-serif;padding:40px;font-size:13px;color:#1a1a2e}.header{display:flex;justify-content:space-between;border-bottom:3px solid #1B4D3E;padding-bottom:16px;margin-bottom:24px}.logo{font-size:20px;font-weight:800;color:#1B4D3E}.meta{text-align:right;font-size:12px;color:#555}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#1B4D3E;color:white}th{padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase}tbody tr{border-bottom:1px solid #eee}td{padding:8px 12px}.totaal{font-weight:800;font-size:15px}.conform{background:#fffbf0;border:1px solid #f0c040;border-radius:8px;padding:14px;margin-bottom:20px;font-size:11px;color:#7d5a00;line-height:1.7}.disc{font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:14px}</style></head><body>");
  win.document.write("<div class='header'><div class='logo'>Schipper Kozijnen<br><span style='font-size:11px;font-weight:400;color:#888'>Subsidieoverzicht voor klant</span></div><div class='meta'><strong>" + klant + "</strong><br>" + adres + "<br>" + postcode + "<br>Datum: " + datum + "</div></div>");
  win.document.write("<table><thead><tr><th>Code</th><th>Maatregel</th><th style='text-align:right'>Hoev.</th><th style='text-align:right'>Catalogus</th><th style='text-align:right'>Subsidie " + pct + "%</th></tr></thead><tbody>" + rHTML + (aHTML ? "<tr><td colspan='5' style='font-weight:700;padding-top:10px;color:#1B4D3E'>Bijkomende kosten</td></tr>" + aHTML : "") + "</tbody></table>");
  win.document.write("<table><tbody><tr><td>Cataloguswaarde</td><td style='text-align:right'>€ " + cat50.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</td></tr>" + (addTotaal > 0 ? "<tr><td>Bijkomende kosten</td><td style='text-align:right'>€ " + addTotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</td></tr>" : "") + "<tr><td><strong>Subsidie (" + pct + "%)</strong></td><td style='text-align:right'><strong>€ " + subsidie.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</strong></td></tr><tr><td>Schipper offerte totaal</td><td style='text-align:right'>€ " + offerte.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</td></tr>" + bHTML + "<tr class='totaal'><td>Eigen bijdrage klant totaal</td><td style='text-align:right;color:#c0392b'>€ " + eigenBijdrage.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</td></tr></tbody></table>");
  win.document.write("<div class='conform'>Deze offerte/factuur voldoet aan de voorwaarden van de maximale prijzen zoals deze zijn vastgesteld in de Maatregelencatalogus van de Isolatieaanpak Nij Begun. Het deel boven de catalogusprijs is voor rekening van de woningeigenaar en is niet subsidiabel.</div>");
  win.document.write("<div class='disc'>Dit document is een indicatief subsidieoverzicht opgesteld door Schipper Kozijnen. Definitieve subsidie wordt vastgesteld door SNN.</div>");
  win.document.write("</body></html>");
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export default function App() {
  const [measures, setMeasures] = useState([]);
  const [addCosts, setAddCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [klant, setKlant] = useState("");
  const [adres, setAdres] = useState("");
  const [postcode, setPostcode] = useState("");
  const [type, setType] = useState("contractor");
  const [regeling, setRegeling] = useState(null);
  const [sel30, setSel30] = useState({});
  const [sel50, setSel50] = useState({});
  const [selAdd, setSelAdd] = useState({});
  const [tab, setTab] = useState("invoer");
  const [off30, setOff30] = useState("");
  const [off50, setOff50] = useState("");
  const [res30, setRes30] = useState(null);
  const [res50, setRes50] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [mRes, acRes] = await Promise.all([apiFetch("/measures"), apiFetch("/measures/V2-3-A4")]);
        setMeasures((mRes.data || []).filter(m => isSchipper(m.id)));
        setAddCosts(acRes.data?.attributes?.additionalCosts || []);
      } catch (e) { setApiError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const m30 = measures.filter(m => is30(m.id));
  const m50 = measures.filter(m => is50(m.id));
  const codes30 = Object.keys(sel30);
  const codes50 = Object.keys(sel50);
  const codesAdd = Object.keys(selAdd);
  const totalSel = codes30.length + codes50.length + codesAdd.length;

  const g30 = {};
  m30.forEach(m => { const s = m.attributes.subcategory?.attributes?.name || "Overig"; if (!g30[s]) g30[s] = []; g30[s].push(m); });
  const g50 = {};
  m50.forEach(m => { const s = m.attributes.subcategory?.attributes?.name || "Overig"; if (!g50[s]) g50[s] = []; g50[s].push(m); });

  const tog30 = (c) => { setSel30(p => { const n = { ...p }; if (n[c] !== undefined) delete n[c]; else n[c] = 1; return n; }); setRes30(null); };
  const tog50 = (c) => { setSel50(p => { const n = { ...p }; if (n[c] !== undefined) delete n[c]; else n[c] = 1; return n; }); setRes50(null); };
  const togAdd = (c) => { setSelAdd(p => { const n = { ...p }; if (n[c] !== undefined) delete n[c]; else n[c] = 1; return n; }); };
  const qty30 = (c, v) => setSel30(p => ({ ...p, [c]: Math.max(0, Number(v)) }));
  const qty50 = (c, v) => setSel50(p => ({ ...p, [c]: Math.max(0, Number(v)) }));
  const qtyAdd = (c, v) => setSelAdd(p => ({ ...p, [c]: Math.max(0, Number(v)) }));

  const addTotaal = codesAdd.reduce((sum, c) => {
    const ac = addCosts.find(x => x.id === c);
    if (!ac) return sum;
    const p = type === "diy" ? ac.attributes.diyValuePerUnit : ac.attributes.contractorValuePerUnit;
    return sum + p * (selAdd[c] || 0);
  }, 0);

  const calculate = async () => {
    setCalcLoading(true); setCalcError(null); setRes30(null); setRes50(null);
    try {
      const p = [];
      if (codes30.length > 0) p.push(apiPost("/measures/subsidies", { type, measures: codes30.map(c => ({ code: c, quantity: sel30[c] || 0 })) }));
      else p.push(Promise.resolve(null));
      if (codes50.length > 0) p.push(apiPost("/measures/subsidies", { type, measures: codes50.map(c => ({ code: c, quantity: sel50[c] || 0 })) }));
      else p.push(Promise.resolve(null));
      const [r30, r50] = await Promise.all(p);
      setRes30(r30); setRes50(r50); setTab("resultaat");
    } catch (e) { setCalcError(e.message); } finally { setCalcLoading(false); }
  };

  const nijBegunPDF = async (rt) => {
    const codes = rt === "30" ? codes30 : codes50;
    const sel = rt === "30" ? sel30 : sel50;
    if (!codes.length) return;
    setPdfLoading(true);
    try {
      const r = await fetch(API + "/measures/generate_pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, measures: codes.map(c => ({ code: c, quantity: sel[c] || 0 })) }) });
      if (!r.ok) throw new Error("PDF mislukt");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "nijbegun-" + rt + "pct-" + (klant.replace(/\s+/g, "-") || "klant") + ".pdf"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert("PDF fout: " + e.message); } finally { setPdfLoading(false); }
  };

  const schipperPDF = (rt) => {
    const result = rt === "30" ? res30 : res50;
    const offerte = parseFloat(rt === "30" ? off30 : off50) || 0;
    if (!result) return;
    const pct = rt === "30" ? 30 : regeling === "100" ? 100 : 50;
    const cat = result.meta?.totalCost || 0;
    const add = rt === "50" ? addTotaal : 0;
    const totCat = cat + add;
    const sub = totCat * pct / 100;
    const boven = Math.max(0, offerte - totCat);
    const eigen = offerte - sub;
    const aRows = rt === "50" ? codesAdd.map(c => {
      const ac = addCosts.find(x => x.id === c);
      const prijs = type === "diy" ? ac.attributes.diyValuePerUnit : ac.attributes.contractorValuePerUnit;
      return { id: c, name: ac.attributes.notes.replace("Betreft:", "").trim(), qty: selAdd[c], unit: ac.attributes.unit, subtotaal: prijs * selAdd[c] };
    }) : [];
    const datum = new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
    printPDF(klant || "Klant", adres || "", postcode || "", pct, cat, add, sub, offerte, boven, eigen, result.data, aRows, datum);
  };

  const cat30 = res30?.meta?.totalCost ?? null;
  const sub30 = cat30 != null ? cat30 * 0.30 : null;
  const cat50 = res50?.meta?.totalCost ?? null;
  const pct50 = regeling === "100" ? 1.0 : 0.5;
  const sub50 = cat50 != null ? (cat50 + addTotaal) * pct50 : null;
  const hasResult = res30 || res50;
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f0f4f0", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 48, height: 48, border: "4px solid #1B4D3E", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#1B4D3E", fontFamily: "sans-serif", fontWeight: 600 }}>Maatregelcatalogus laden...</div>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );

  if (apiError) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fff5f5", flexDirection: "column", gap: 12, fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 40 }}>!</div>
      <div style={{ fontWeight: 700, color: "#c0392b" }}>API niet bereikbaar</div>
      <div style={{ color: "#666", fontSize: 13 }}>{apiError}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f1", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#1a1a2e" }}>
      <div style={{ background: "linear-gradient(135deg,#0d2e1f,#1B4D3E,#2D6A4F)", color: "white", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>Schipper Kozijnen - Subsidieadviseur</div>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{measures.length} relevante maatregelen - Nij Begun API</div>
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.12)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)" }}>
          {[["diy", "Doe-het-zelf"], ["contractor", "Aannemer"]].map(([v, label]) => (
            <button key={v} onClick={() => setType(v)} style={{ padding: "7px 14px", border: "none", background: type === v ? "rgba(255,255,255,0.25)" : "transparent", color: "white", fontSize: 12, fontWeight: type === v ? 700 : 400, cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", minHeight: "calc(100vh - 56px)" }}>
        <div style={{ padding: "20px 24px", overflow: "auto" }}>

          <div style={{ background: "white", borderRadius: 12, padding: "16px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1B4D3E", marginBottom: 12 }}>Klantgegevens</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px", gap: 12 }}>
              {[["Naam klant", klant, setKlant, "Jan de Vries"], ["Adres", adres, setAdres, "Straat 1, 9700 AB"], ["Postcode", postcode, setPostcode, "9700 AB"]].map(([label, val, setter, ph]) => (
                <div key={label}>
                  <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #dde", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {[["invoer", "Maatregelen"], ["offerte", "Schipper offerte"], ["resultaat", "Resultaat"]].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12, background: tab === t ? "#1B4D3E" : "white", color: tab === t ? "white" : "#555", boxShadow: tab === t ? "0 2px 8px rgba(27,77,62,0.3)" : "0 1px 3px rgba(0,0,0,0.08)" }}>
                {label}
              </button>
            ))}
          </div>

          {tab === "invoer" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ background: "linear-gradient(135deg,#7d5a00,#c49a00)", color: "white", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>30% Regeling - Triple glas</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Vervangen kozijn met triple glas - dakkapel</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{codes30.length} geselecteerd</div>
                </div>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(g30).map(([sub, items]) => (
                    <div key={sub}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#c49a00", marginBottom: 8 }}>{sub}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {items.map(m => {
                          const cost = m.attributes.regularCosts?.[0]?.attributes;
                          const uc = type === "diy" ? cost?.diyValuePerUnit : cost?.contractorValuePerUnit;
                          return <Kaart key={m.id} id={m.id} name={m.attributes.name} unit={m.attributes.unit} unitCost={uc} isSelected={sel30[m.id] !== undefined} onToggle={tog30} onQtyChange={qty30} qty={sel30[m.id]} color="#c49a00" />;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ background: "linear-gradient(135deg,#1B4D3E,#2D6A4F)", color: "white", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>50% / 100% Regeling - HR++ glas</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>HR++ glas - kierdichting - dakramen - bijkomende kosten</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{codes50.length + codesAdd.length} geselecteerd</div>
                </div>
                <div style={{ padding: "14px 20px 0", display: "flex", gap: 8 }}>
                  {[["50", "50% regeling"], ["100", "100% regeling"]].map(([v, label]) => (
                    <button key={v} onClick={() => setRegeling(v)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: regeling === v ? "2px solid #1B4D3E" : "1.5px solid #dde", background: regeling === v ? "#1B4D3E" : "white", color: regeling === v ? "white" : "#555", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{label}</button>
                  ))}
                </div>
                <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(g50).map(([sub, items]) => (
                    <div key={sub}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2D6A4F", marginBottom: 8 }}>{sub}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {items.map(m => {
                          const cost = m.attributes.regularCosts?.[0]?.attributes;
                          const uc = type === "diy" ? cost?.diyValuePerUnit : cost?.contractorValuePerUnit;
                          return <Kaart key={m.id} id={m.id} name={m.attributes.name} unit={m.attributes.unit} unitCost={uc} isSelected={sel50[m.id] !== undefined} onToggle={tog50} onQtyChange={qty50} qty={sel50[m.id]} color="#2D6A4F" />;
                        })}
                      </div>
                    </div>
                  ))}
                  {addCosts.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#2D6A4F", marginBottom: 8, borderTop: "1px solid #eee", paddingTop: 12 }}>Bijkomende kosten (V2-3-X)</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {addCosts.map(ac => {
                          const uc = type === "diy" ? ac.attributes.diyValuePerUnit : ac.attributes.contractorValuePerUnit;
                          const name = ac.attributes.notes.replace("Betreft:", "").trim();
                          return <Kaart key={ac.id} id={ac.id} name={name} unit={ac.attributes.unit} unitCost={uc} isSelected={selAdd[ac.id] !== undefined} onToggle={togAdd} onQtyChange={qtyAdd} qty={selAdd[ac.id]} color="#2D6A4F" />;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {tab === "offerte" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {codes30.length > 0 && (
                <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div style={{ background: "linear-gradient(135deg,#7d5a00,#c49a00)", color: "white", padding: "14px 20px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>30% Regeling - Schipper offertebedrag</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Vul het totale offertebedrag in van Schipper Kozijnen</div>
                  </div>
                  <div style={{ padding: "20px" }}>
                    <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Totaal offertebedrag Schipper (incl. BTW)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#c49a00" }}>€</span>
                      <input type="number" min="0" value={off30} onChange={e => setOff30(e.target.value)} placeholder="0.00" style={{ flex: 1, padding: "12px 16px", border: "2px solid #f0c040", borderRadius: 10, fontSize: 18, fontWeight: 700, outline: "none", color: "#7d5a00" }} />
                    </div>
                    {off30 && cat30 && (
                      <div style={{ marginTop: 14, padding: "12px 16px", background: "#fffbf0", borderRadius: 10, border: "1px solid #f0c040" }}>
                        <div style={{ fontSize: 12, color: "#7d5a00", display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Cataloguswaarde</span><span>{"€ " + cat30.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                        <div style={{ fontSize: 12, color: "#7d5a00", display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Subsidie (30%)</span><span>{"€ " + sub30.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                        <div style={{ fontSize: 12, color: "#7d5a00", display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Boven catalogus</span><span>{"€ " + Math.max(0, parseFloat(off30) - cat30).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#c0392b", display: "flex", justifyContent: "space-between", borderTop: "1px solid #f0c040", paddingTop: 8, marginTop: 4 }}><span>Eigen bijdrage klant</span><span>{"€ " + Math.max(0, parseFloat(off30) - (cat30 * 0.30)).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(codes50.length > 0 || codesAdd.length > 0) && (
                <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div style={{ background: "linear-gradient(135deg,#1B4D3E,#2D6A4F)", color: "white", padding: "14px 20px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{(regeling === "100" ? "100%" : "50%") + " Regeling - Schipper offertebedrag"}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Vul het totale offertebedrag in van Schipper Kozijnen</div>
                  </div>
                  <div style={{ padding: "20px" }}>
                    <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Totaal offertebedrag Schipper (incl. BTW)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#2D6A4F" }}>€</span>
                      <input type="number" min="0" value={off50} onChange={e => setOff50(e.target.value)} placeholder="0.00" style={{ flex: 1, padding: "12px 16px", border: "2px solid #2D6A4F", borderRadius: 10, fontSize: 18, fontWeight: 700, outline: "none", color: "#1B4D3E" }} />
                    </div>
                    {off50 && (cat50 || addTotaal > 0) && (
                      <div style={{ marginTop: 14, padding: "12px 16px", background: "#f0f8f4", borderRadius: 10, border: "1px solid #2D6A4F" }}>
                        <div style={{ fontSize: 12, color: "#1B4D3E", display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Cataloguswaarde</span><span>{"€ " + (cat50 || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                        {addTotaal > 0 && <div style={{ fontSize: 12, color: "#1B4D3E", display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Bijkomende kosten</span><span>{"€ " + addTotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>}
                        <div style={{ fontSize: 12, color: "#1B4D3E", display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>{"Subsidie (" + (regeling === "100" ? "100" : "50") + "%)"}</span><span>{"€ " + (sub50 || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                        <div style={{ fontSize: 12, color: "#1B4D3E", display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span>Boven catalogus</span><span>{"€ " + Math.max(0, parseFloat(off50) - ((cat50 || 0) + addTotaal)).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#c0392b", display: "flex", justifyContent: "space-between", borderTop: "1px solid #2D6A4F", paddingTop: 8, marginTop: 4 }}><span>Eigen bijdrage klant</span><span>{"€ " + Math.max(0, parseFloat(off50) - (sub50 || 0)).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {codes30.length === 0 && codes50.length === 0 && codesAdd.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>€</div>
                  <div style={{ fontSize: 14 }}>Selecteer eerst maatregelen in de <strong style={{ color: "#1B4D3E" }}>Maatregelen tab</strong></div>
                </div>
              )}
              {!hasResult && totalSel > 0 && (
                <div style={{ background: "#fff8f0", border: "1px solid #f0c040", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#7d5a00" }}>
                  Klik eerst op <strong>Bereken subsidie</strong> in de sidebar voordat de eigen bijdrage berekend kan worden.
                </div>
              )}
            </div>
          )}
          {tab === "resultaat" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!hasResult && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>%</div>
                  <div style={{ fontSize: 14 }}>Selecteer maatregelen en klik op <strong style={{ color: "#1B4D3E" }}>Bereken subsidie</strong></div>
                </div>
              )}
              {calcError && <div style={{ background: "#fff0f0", border: "1px solid #f5c6c6", borderRadius: 10, padding: "14px 18px", color: "#c0392b", fontSize: 13 }}>{"Fout: " + calcError}</div>}

              {res30 && (() => {
                const offerte = parseFloat(off30) || 0;
                const subsidie = sub30 || 0;
                const bovenCat = Math.max(0, offerte - (cat30 || 0));
                const eigenBijdrage = offerte - subsidie;
                return (
                  <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                    <div style={{ background: "linear-gradient(135deg,#7d5a00,#c49a00)", color: "white", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>30% Regeling - Triple glas</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{"Cataloguswaarde: € " + (cat30 || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, opacity: 0.8 }}>Subsidie (30%)</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{"€ " + subsidie.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr style={{ background: "#fdf8e8" }}>{["Maatregel", "Hoev.", "Catalogus", "Subsidie 30%"].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: h === "Maatregel" ? "left" : "right", fontSize: 10, fontWeight: 700, color: "#7d5a00", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
                      <tbody>{res30.data.map((row, i) => (
                        <tr key={row.id} style={{ borderBottom: "1px solid #f5f0e0", background: i % 2 === 0 ? "#fffef8" : "white" }}>
                          <td style={{ padding: "9px 14px" }}><div style={{ fontWeight: 600, fontSize: 12 }}>{row.attributes.name}</div><div style={{ fontSize: 10, color: "#bbb" }}>{row.id}</div></td>
                          <td style={{ padding: "9px 14px", textAlign: "right", fontSize: 12 }}>{row.attributes.quantity + " " + row.attributes.unit}</td>
                          <td style={{ padding: "9px 14px", textAlign: "right", fontSize: 12 }}>{"€ " + row.attributes.totalForQuantity.toFixed(2)}</td>
                          <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#7d5a00" }}>{"€ " + (row.attributes.totalForQuantity * 0.30).toFixed(2)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                    {offerte > 0 && (
                      <div style={{ padding: "16px 20px", background: "#fdf8e8", borderTop: "1px solid #f0e0a0" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#7d5a00", marginBottom: 10 }}>Kostenoverzicht voor klant</div>
                        {[["Cataloguswaarde", "€ " + (cat30 || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2 })], ["Subsidie (30%)", "€ " + subsidie.toLocaleString("nl-NL", { minimumFractionDigits: 2 })], ["Schipper offerte", "€ " + offerte.toLocaleString("nl-NL", { minimumFractionDigits: 2 })], bovenCat > 0 ? ["Boven catalogus (niet subsidiabel)", "€ " + bovenCat.toLocaleString("nl-NL", { minimumFractionDigits: 2 })] : null, ["Eigen bijdrage klant", "€ " + eigenBijdrage.toLocaleString("nl-NL", { minimumFractionDigits: 2 })]].filter(Boolean).map(([label, val], idx, arr) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0e0a0", fontWeight: idx === arr.length - 1 ? 800 : 400, fontSize: idx === arr.length - 1 ? 15 : 13, color: idx === arr.length - 1 ? "#c0392b" : label.includes("niet") ? "#c0392b" : "#333" }}>
                            <span>{label}</span><span>{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ padding: "12px 20px", display: "flex", gap: 8 }}>
                      <button onClick={() => nijBegunPDF("30")} disabled={pdfLoading} style={{ background: "#f0c040", color: "#7d5a00", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Nij Begun PDF</button>
                      <button onClick={() => schipperPDF("30")} style={{ background: "#c49a00", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Schipper klantoverzicht</button>
                    </div>
                  </div>
                );
              })()}

              {res50 && (() => {
                const offerte = parseFloat(off50) || 0;
                const pct = regeling === "100" ? 100 : 50;
                const subsidie = sub50 || 0;
                const totCat = (cat50 || 0) + addTotaal;
                const bovenCat = Math.max(0, offerte - totCat);
                const eigenBijdrage = offerte - subsidie;
                return (
                  <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                    <div style={{ background: "linear-gradient(135deg,#1B4D3E,#2D6A4F)", color: "white", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{pct + "% Regeling - HR++ glas"}</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{"Catalogus: € " + totCat.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + (addTotaal > 0 ? " (incl. bijkomend)" : "")}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, opacity: 0.8 }}>{"Subsidie (" + pct + "%)"}</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{"€ " + subsidie.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr style={{ background: "#f0f8f4" }}>{["Maatregel", "Hoev.", "Catalogus", "Subsidie " + pct + "%"].map(h => <th key={h} style={{ padding: "8px 14px", textAlign: h === "Maatregel" ? "left" : "right", fontSize: 10, fontWeight: 700, color: "#1B4D3E", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {res50.data.map((row, i) => (
                          <tr key={row.id} style={{ borderBottom: "1px solid #eef2ee", background: i % 2 === 0 ? "#fafcfa" : "white" }}>
                            <td style={{ padding: "9px 14px" }}><div style={{ fontWeight: 600, fontSize: 12 }}>{row.attributes.name}</div><div style={{ fontSize: 10, color: "#bbb" }}>{row.id}</div></td>
                            <td style={{ padding: "9px 14px", textAlign: "right", fontSize: 12 }}>{row.attributes.quantity + " " + row.attributes.unit}</td>
                            <td style={{ padding: "9px 14px", textAlign: "right", fontSize: 12 }}>{"€ " + row.attributes.totalForQuantity.toFixed(2)}</td>
                            <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#1B4D3E" }}>{"€ " + (row.attributes.totalForQuantity * pct / 100).toFixed(2)}</td>
                          </tr>
                        ))}
                        {codesAdd.length > 0 && (
                          <>
                            <tr style={{ background: "#f0f8f4" }}>
                              <td colSpan={4} style={{ padding: "8px 14px", fontSize: 11, fontWeight: 800, color: "#1B4D3E", textTransform: "uppercase" }}>Bijkomende kosten</td>
                            </tr>
                            {codesAdd.map((code, i) => {
                              const ac = addCosts.find(x => x.id === code);
                              if (!ac) return null;
                              const prijs = type === "diy" ? ac.attributes.diyValuePerUnit : ac.attributes.contractorValuePerUnit;
                              const subtotaal = prijs * (selAdd[code] || 0);
                              const name = ac.attributes.notes.replace("Betreft:", "").trim();
                              return (
                                <tr key={code} style={{ borderBottom: "1px solid #eef2ee", background: i % 2 === 0 ? "#f9fcfa" : "white" }}>
                                  <td style={{ padding: "9px 14px" }}><div style={{ fontWeight: 600, fontSize: 12 }}>{name}</div><div style={{ fontSize: 10, color: "#bbb" }}>{code}</div></td>
                                  <td style={{ padding: "9px 14px", textAlign: "right", fontSize: 12 }}>{selAdd[code] + " " + ac.attributes.unit}</td>
                                  <td style={{ padding: "9px 14px", textAlign: "right", fontSize: 12 }}>{"€ " + subtotaal.toFixed(2)}</td>
                                  <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#1B4D3E" }}>{"€ " + (subtotaal * pct / 100).toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </>
                        )}
                      </tbody>
                    </table>
                    {offerte > 0 && (
                      <div style={{ padding: "16px 20px", background: "#f0f8f4", borderTop: "1px solid #c8e6d4" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#1B4D3E", marginBottom: 10 }}>Kostenoverzicht voor klant</div>
                        {[["Cataloguswaarde", "€ " + (cat50 || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2 })], addTotaal > 0 ? ["Bijkomende kosten", "€ " + addTotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })] : null, ["Subsidie (" + pct + "%)", "€ " + subsidie.toLocaleString("nl-NL", { minimumFractionDigits: 2 })], ["Schipper offerte", "€ " + offerte.toLocaleString("nl-NL", { minimumFractionDigits: 2 })], bovenCat > 0 ? ["Boven catalogus (niet subsidiabel)", "€ " + bovenCat.toLocaleString("nl-NL", { minimumFractionDigits: 2 })] : null, ["Eigen bijdrage klant", "€ " + eigenBijdrage.toLocaleString("nl-NL", { minimumFractionDigits: 2 })]].filter(Boolean).map(([label, val], idx, arr) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #c8e6d4", fontWeight: idx === arr.length - 1 ? 800 : 400, fontSize: idx === arr.length - 1 ? 15 : 13, color: idx === arr.length - 1 ? "#c0392b" : label.includes("niet") ? "#c0392b" : "#333" }}>
                            <span>{label}</span><span>{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ padding: "12px 20px", display: "flex", gap: 8 }}>
                      <button onClick={() => nijBegunPDF("50")} disabled={pdfLoading} style={{ background: "#95D5B2", color: "#1B4D3E", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Nij Begun PDF</button>
                      <button onClick={() => schipperPDF("50")} style={{ background: "#1B4D3E", color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Schipper klantoverzicht</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        <div style={{ background: "white", borderLeft: "1px solid #e0e8e0", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1B4D3E" }}>Samenvatting</div>
          {(klant || postcode) && (
            <div style={{ background: "#f4f9f5", borderRadius: 10, padding: "12px 14px", borderLeft: "3px solid #2D6A4F" }}>
              {klant && <div style={{ fontWeight: 700, fontSize: 13 }}>{klant}</div>}
              {adres && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{adres}</div>}
              {postcode && <div style={{ fontSize: 11, color: "#888" }}>{"Postcode: " + postcode}</div>}
            </div>
          )}
          <div style={{ borderRadius: 10, padding: "12px 14px", background: "#fffbf0", border: "1.5px solid #f0c040" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#7d5a00", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>30% Triple glas</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#7d5a00" }}>
              {sub30 != null ? ("€ " + sub30.toLocaleString("nl-NL", { minimumFractionDigits: 2 })) : (codes30.length + " maatregelen")}
            </div>
            {cat30 != null && <div style={{ fontSize: 10, color: "#9a7000", marginTop: 2 }}>{"Catalogus: € " + cat30.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</div>}
          </div>
          <div style={{ borderRadius: 10, padding: "12px 14px", background: "#eef8f2", border: "1.5px solid #2D6A4F" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#1B4D3E", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {(regeling === "100" ? "100%" : regeling === "50" ? "50%" : "50%/100%") + " HR++ glas"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1B4D3E" }}>
              {sub50 != null ? ("€ " + sub50.toLocaleString("nl-NL", { minimumFractionDigits: 2 })) : ((codes50.length + codesAdd.length) + " maatregelen")}
            </div>
            {cat50 != null && (
              <div style={{ fontSize: 10, color: "#2D6A4F", marginTop: 2 }}>
                {"Catalogus: € " + ((cat50 || 0) + addTotaal).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                {addTotaal > 0 && " (incl. bijkomend)"}
              </div>
            )}
          </div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {!regeling && (codes50.length > 0 || codesAdd.length > 0) && (
              <div style={{ fontSize: 11, color: "#e67e22", background: "#fff8f0", padding: "8px 10px", borderRadius: 8, textAlign: "center" }}>
                Kies 50% of 100% regeling
              </div>
            )}
            {calcError && <div style={{ fontSize: 11, color: "#e74c3c", textAlign: "center" }}>{calcError}</div>}
            <button
              onClick={calculate}
              disabled={totalSel === 0 || calcLoading || ((codes50.length > 0 || codesAdd.length > 0) && !regeling)}
              style={{
                background: totalSel > 0 && (codes50.length === 0 || regeling) ? "#1B4D3E" : "#ddd",
                color: totalSel > 0 && (codes50.length === 0 || regeling) ? "white" : "#aaa",
                border: "none", borderRadius: 10, padding: "13px",
                fontWeight: 700, fontSize: 14,
                cursor: totalSel > 0 ? "pointer" : "not-allowed",
                width: "100%"
              }}>
              {calcLoading ? "Berekenen..." : "Bereken subsidie (" + totalSel + ")"}
            </button>
            <div style={{ background: "#fffbf0", borderRadius: 8, padding: "10px 12px", border: "1px solid #f0e0a0" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#856404", marginBottom: 3 }}>Let op</div>
              <div style={{ fontSize: 10, color: "#666", lineHeight: 1.6 }}>Indicatieve berekening. Definitieve subsidie vastgesteld door SNN.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

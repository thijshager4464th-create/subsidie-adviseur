import { useState, useEffect } from "react";

const API = "https://api.nij-begun.project.abl.nu/api/v1";
const PREFIXES_30 = ["V2-4", "V4-1-I"];
const PREFIXES_50 = ["V2-1", "V2-2", "V2-3", "V4-3", "V4-4", "V6-1-C", "V6-1-D"];
const RED = "#E31E24";
const DARKRED = "#B01419";
const GOLD = "#c49a00";
const DARKGOLD = "#7d5a00";

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
    <div onClick={() => onToggle(id)} style={{ background: isSelected ? "#fff0f0" : "white", border: isSelected ? "2px solid " + color : "1.5px solid #e8eae8", borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.12s" }}>
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

function printPDF(klant, adres, postcode, projNr, pct, cat, addTotaal, subsidie, offerte, bovenCat, eigenBijdrage, rows, addRows, datum, meerkosten) {
  const rHTML = rows.map(r => "<tr><td>" + r.id + "</td><td>" + r.attributes.name + "</td><td style='text-align:right'>" + r.attributes.quantity + " " + r.attributes.unit + "</td><td style='text-align:right'>€ " + r.attributes.totalForQuantity.toFixed(2) + "</td><td style='text-align:right'>€ " + (r.attributes.totalForQuantity * pct / 100).toFixed(2) + "</td></tr>").join("");
  const aHTML = addRows.map(r => "<tr style='background:#fafafa'><td>" + r.id + "</td><td>" + r.name + "</td><td style='text-align:right'>" + r.qty + " " + r.unit + "</td><td style='text-align:right'>€ " + r.subtotaal.toFixed(2) + "</td><td style='text-align:right'>€ " + (r.subtotaal * pct / 100).toFixed(2) + "</td></tr>").join("");
  const bHTML = bovenCat > 0 ? "<tr style='color:#c0392b;background:#fff5f5'><td colspan='4'><strong>Boven catalogusmaximum (eigen rekening, niet subsidiabel)</strong></td><td style='text-align:right'>€ " + bovenCat.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</td></tr>" : "";

  const mkGevuld = (meerkosten || []).filter(m => m.omschrijving.trim() && parseFloat(m.bedrag) > 0);
  const mkTotaal = mkGevuld.reduce((s, m) => s + (parseFloat(m.bedrag) || 0), 0);
  const mkHTML = mkGevuld.length > 0
    ? "<tr><td colspan='5' style='font-weight:700;padding-top:10px;color:#c0392b;background:#fff5f5'>Meerkosten boven maatregelcatalogus (niet subsidiabel, eigen rekening)</td></tr>" +
      mkGevuld.map(m => "<tr style='background:#fff8f8'><td colspan='3' style='font-style:italic'>" + m.omschrijving + "</td><td style='text-align:right'>€ " + parseFloat(m.bedrag).toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</td><td style='text-align:right;color:#c0392b'>€ 0,00</td></tr>").join("")
    : "";
  const mkSamenvattingHTML = mkTotaal > 0
    ? "<tr style='color:#c0392b'><td><strong>Meerkosten boven catalogus (eigen rekening)</strong></td><td style='text-align:right'><strong>€ " + mkTotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</strong></td></tr>"
    : "";

  const win = window.open("", "_blank");
  win.document.write("<!DOCTYPE html><html lang='nl'><head><meta charset='UTF-8'><title>Subsidieoverzicht - " + klant + "</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Segoe UI,sans-serif;padding:40px;font-size:13px;color:#1a1a2e}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #E31E24;padding-bottom:16px;margin-bottom:24px}.logo{height:48px}.meta{text-align:right;font-size:12px;color:#555}.projnr{display:inline-block;background:#E31E24;color:white;padding:3px 10px;border-radius:4px;font-weight:700;font-size:12px;margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#E31E24;color:white}th{padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase}tbody tr{border-bottom:1px solid #eee}td{padding:8px 12px}.totaal{font-weight:800;font-size:15px;background:#fff0f0}.waarschuwing{background:#fff8f0;border:2px solid #f0a000;border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px;color:#7d4000;line-height:1.8;font-weight:600}.conform{background:#fff0f0;border:2px solid #E31E24;border-radius:8px;padding:16px;margin-bottom:20px;font-size:12px;color:#8B0000;line-height:1.8}.disc{font-size:11px;color:#888;border-top:1px solid #eee;padding-top:14px}@media print{body{padding:20px}}</style></head><body>");
  win.document.write("<div class='header'><img src='https://subsidie-adviseur.vercel.app/images.png' class='logo' alt='Schipper Kozijnen' /><div class='meta'>" + (projNr ? "<span class='projnr'>Project: " + projNr + "</span><br>" : "") + "<strong>" + klant + "</strong><br>" + adres + "<br>" + postcode + "<br>Datum: " + datum + "</div></div>");
  win.document.write("<table><thead><tr><th>Code</th><th>Maatregel</th><th style='text-align:right'>Hoev.</th><th style='text-align:right'>Catalogus</th><th style='text-align:right'>Subsidie " + pct + "%</th></tr></thead><tbody>" + rHTML + (aHTML ? "<tr><td colspan='5' style='font-weight:700;padding-top:10px;color:#E31E24;background:#fff5f5'>Bijkomende kosten</td></tr>" + aHTML : "") + mkHTML + "</tbody></table>");
  win.document.write("<table><tbody><tr><td>Cataloguswaarde maatregelen</td><td style='text-align:right'>€ " + cat.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</td></tr>" + (addTotaal > 0 ? "<tr><td>Bijkomende kosten</td><td style='text-align:right'>€ " + addTotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</td></tr>" : "") + "<tr><td><strong>Subsidie (" + pct + "%)</strong></td><td style='text-align:right'><strong>€ " + subsidie.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</strong></td></tr><tr><td>Schipper Kozijnen offerte totaal</td><td style='text-align:right'>€ " + offerte.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</td></tr>" + bHTML + mkSamenvattingHTML + "<tr class='totaal'><td><strong>Eigen bijdrage klant totaal</strong></td><td style='text-align:right;color:#c0392b'><strong>€ " + eigenBijdrage.toLocaleString("nl-NL", { minimumFractionDigits: 2 }) + "</strong></td></tr></tbody></table>");
  win.document.write("<div class='waarschuwing'>LET OP: Dit overzicht is een INDICATIEVE berekening. De definitieve subsidie wordt vastgesteld door SNN na beoordeling van de volledige aanvraag. Aan dit document kunnen geen rechten worden ontleend. Schipper Kozijnen is niet verantwoordelijk voor het uiteindelijke subsidiebedrag.</div>");
  win.document.write("<div class='conform'>Deze offerte/factuur voldoet aan de voorwaarden van de maximale prijzen zoals deze zijn vastgesteld in de Maatregelencatalogus van de Isolatieaanpak Nij Begun. Het deel boven de catalogusprijs is voor rekening van de woningeigenaar en is niet subsidiabel.</div>");
  win.document.write("<div class='disc'>Schipper Kozijnen - Subsidieoverzicht gegenereerd via Nij Begun Maatregelencatalogus API</div>");
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
  const [projNr, setProjNr] = useState("");
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
  const [meerkosten, setMeerkosten] = useState([{ omschrijving: "", bedrag: "" }]);

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

  const meerkostenTotaal = meerkosten.reduce((s, m) => s + (parseFloat(m.bedrag) || 0), 0);
  const voegMeerkostToe = () => setMeerkosten(m => [...m, { omschrijving: "", bedrag: "" }]);
  const verwijderMeerkosten = (i) => setMeerkosten(m => m.filter((_, j) => j !== i));
  const updateMeerkosten = (i, field, val) => setMeerkosten(m => m.map((x, j) => j === i ? { ...x, [field]: val } : x));

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
    const eigen = offerte - sub + meerkostenTotaal;
    const aRows = rt === "50" ? codesAdd.map(c => {
      const ac = addCosts.find(x => x.id === c);
      const prijs = type === "diy" ? ac.attributes.diyValuePerUnit : ac.attributes.contractorValuePerUnit;
      return { id: c, name: ac.attributes.notes.replace("Betreft:", "").trim(), qty: selAdd[c], unit: ac.attributes.unit, subtotaal: prijs * selAdd[c] };
    }) : [];
    const datum = new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
    printPDF(klant || "Klant", adres || "", postcode || "", projNr || "", pct, cat, add, sub, offerte, boven, eigen, result.data, aRows, datum, meerkosten);
  };

  const cat30 = res30?.meta?.totalCost ?? null;
  const sub30 = cat30 != null ? cat30 * 0.30 : null;
  const cat50v = res50?.meta?.totalCost ?? null;
  const pct50 = regeling === "100" ? 1.0 : 0.5;
  const sub50 = cat50v != null ? (cat50v + addTotaal) * pct50 : null;
  const hasResult = res30 || res50;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fff5f5", flexDirection: "column", gap: 16 }}>
      <img src="/images.png" alt="Schipper Kozijnen" style={{ height: 60, marginBottom: 8 }} />
      <div style={{ width: 48, height: 48, border: "4px solid " + RED, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: RED, fontFamily: "sans-serif", fontWeight: 600 }}>Maatregelcatalogus laden...</div>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );

  if (apiError) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fff5f5", flexDirection: "column", gap: 12, fontFamily: "sans-serif" }}>
      <img src="/images.png" alt="Schipper Kozijnen" style={{ height: 50, marginBottom: 8 }} />
      <div style={{ fontWeight: 700, color: RED }}>API niet bereikbaar</div>
      <div style={{ color: "#666", fontSize: 13 }}>{apiError}</div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f7", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#1a1a2e" }}>
      <div style={{ background: "linear-gradient(135deg," + DARKRED + "," + RED + ")", color: "white", padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(227,30,36,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: "white", borderRadius: 6, padding: "3px 8px", display: "flex", alignItems: "center" }}>
            <img src="/images.png" alt="Schipper Kozijnen" style={{ height: 36 }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>Subsidieadviseur</div>
            <div style={{ fontSize: 10, opacity: 0.75, marginTop: 1 }}>{measures.length + " maatregelen geladen via Nij Begun API"}</div>
          </div>
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.15)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.25)" }}>
          {[["diy", "Doe-het-zelf"], ["contractor", "Aannemer"]].map(([v, label]) => (
            <button key={v} onClick={() => setType(v)} style={{ padding: "7px 14px", border: "none", background: type === v ? "rgba(255,255,255,0.25)" : "transparent", color: "white", fontSize: 12, fontWeight: type === v ? 700 : 400, cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", minHeight: "calc(100vh - 64px)" }}>
        <div style={{ padding: "20px 24px", overflow: "auto" }}>
          <div style={{ background: "white", borderRadius: 12, padding: "16px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid " + RED }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: RED, marginBottom: 12 }}>Klantgegevens</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 130px 130px", gap: 12 }}>
              {[["Naam klant", klant, setKlant, "Jan de Vries"], ["Adres", adres, setAdres, "Straat 1, 9700 AB"], ["Postcode", postcode, setPostcode, "9700 AB"], ["Projectnummer", projNr, setProjNr, "2026-001"]].map(([label, val, setter, ph]) => (
                <div key={label}>
                  <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #dde", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {[["invoer", "Maatregelen"], ["offerte", "Schipper offerte"], ["resultaat", "Resultaat"]].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12, background: tab === t ? RED : "white", color: tab === t ? "white" : "#555", boxShadow: tab === t ? "0 2px 8px rgba(227,30,36,0.3)" : "0 1px 3px rgba(0,0,0,0.08)" }}>
                {label}
              </button>
            ))}
          </div>

          {tab === "invoer" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ background: "linear-gradient(135deg," + DARKGOLD + "," + GOLD + ")", color: "white", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>30% Regeling - Triple glas</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Vervangen kozijn met triple glas - dakkapel</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{codes30.length + " geselecteerd"}</div>
                </div>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(g30).map(([sub, items]) => (
                    <div key={sub}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: DARKGOLD, marginBottom: 8 }}>{sub}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {items.map(m => {
                          const cost = m.attributes.regularCosts?.[0]?.attributes?.[type === "diy" ? "diyValuePerUnit" : "contractorValuePerUnit"];
                          return <Kaart key={m.id} id={m.id} name={m.attributes.name} unit={m.attributes.unit} unitCost={cost} isSelected={!!sel30[m.id]} onToggle={tog30} onQtyChange={qty30} qty={sel30[m.id]} color={GOLD} />;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ background: "linear-gradient(135deg," + DARKRED + "," + RED + ")", color: "white", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>50% Regeling - HR++ glas</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Vervangen kozijn met HR++ glas</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{codes50.length + " geselecteerd"}</div>
                </div>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(g50).map(([sub, items]) => (
                    <div key={sub}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: RED, marginBottom: 8 }}>{sub}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {items.map(m => {
                          const cost = m.attributes.regularCosts?.[0]?.attributes?.[type === "diy" ? "diyValuePerUnit" : "contractorValuePerUnit"];
                          return <Kaart key={m.id} id={m.id} name={m.attributes.name} unit={m.attributes.unit} unitCost={cost} isSelected={!!sel50[m.id]} onToggle={tog50} onQtyChange={qty50} qty={sel50[m.id]} color={RED} />;
                        })}
                      </div>
                    </div>
                  ))}

                  {addCosts.length > 0 && (
                    <div style={{ marginTop: 8, borderTop: "1px dashed #eee", paddingTop: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: 8 }}>Bijkomende kosten (50%)</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {addCosts.map(ac => {
                          const cost = type === "diy" ? ac.attributes.diyValuePerUnit : ac.attributes.contractorValuePerUnit;
                          return <Kaart key={ac.id} id={ac.id} name={ac.attributes.notes.replace("Betreft:", "").trim()} unit={ac.attributes.unit} unitCost={cost} isSelected={!!selAdd[ac.id]} onToggle={togAdd} onQtyChange={qtyAdd} qty={selAdd[ac.id]} color={RED} />;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ background: "linear-gradient(135deg,#7d2a2a,#c0392b)", color: "white", padding: "14px 20px" }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Meerkosten boven maatregelcatalogus</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Niet subsidiabel — voor eigen rekening klant</div>
                </div>
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 14, lineHeight: 1.6 }}>
                    Voeg kosten toe die boven de catalogusprijs uitkomen. Deze worden apart vermeld op het subsidieoverzicht.
                  </div>
                  {meerkosten.map((mk, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                      <input value={mk.omschrijving} onChange={e => updateMeerkosten(i, "omschrijving", e.target.value)} placeholder="Omschrijving meerkosten..." style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #dde", borderRadius: 8, fontSize: 13, outline: "none" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 13, color: "#888", fontWeight: 700 }}>€</span>
                        <input type="number" min="0" value={mk.bedrag} onChange={e => updateMeerkosten(i, "bedrag", e.target.value)} placeholder="0,00" style={{ width: 100, padding: "8px 10px", border: "1.5px solid #dde", borderRadius: 8, fontSize: 13, outline: "none", textAlign: "right" }} />
                      </div>
                      {meerkosten.length > 1 && (
                        <button onClick={() => verwijderMeerkosten(i)} style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid #dde", background: "white", color: "#aaa", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={voegMeerkostToe} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px dashed #c0392b", background: "white", color: "#c0392b", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>+ Meerkost toevoegen</button>
                  {meerkostenTotaal > 0 && (
                    <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff5f5", borderRadius: 8, border: "1px solid #f5c6c6", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#c0392b" }}>
                      <span>Totaal meerkosten (eigen rekening)</span>
                      <span>€ {meerkostenTotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "offerte" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid " + GOLD }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: GOLD, marginBottom: 12 }}>Offertebedrag 30% regeling</div>
                <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 6 }}>Totaal Schipper Kozijnen offerte incl. BTW</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: "#555" }}>€</span>
                  <input type="number" value={off30} onChange={e => setOff30(e.target.value)} placeholder="0,00" style={{ width: 160, padding: "8px 12px", border: "1.5px solid #dde", borderRadius: 8, fontSize: 14, outline: "none" }} />
                </div>
              </div>
              <div style={{ background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid " + RED }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: RED, marginBottom: 12 }}>Offertebedrag 50%/100% regeling</div>
                <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 6 }}>Totaal Schipper Kozijnen offerte incl. BTW</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: "#555" }}>€</span>
                  <input type="number" value={off50} onChange={e => setOff50(e.target.value)} placeholder="0,00" style={{ width: 160, padding: "8px 12px", border: "1.5px solid #dde", borderRadius: 8, fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: 10 }}>Regelingtype</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["50", "50% standaard"], ["100", "100% laag inkomen"]].map(([v, label]) => (
                      <button key={v} onClick={() => setRegeling(v)} style={{ padding: "8px 14px", borderRadius: 8, border: regeling === v ? "2px solid " + RED : "1.5px solid #dde", background: regeling === v ? "#fff0f0" : "white", color: regeling === v ? RED : "#555", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab === "resultaat" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!hasResult && <div style={{ background: "white", borderRadius: 12, padding: "32px", textAlign: "center", color: "#888" }}>Klik eerst op Berekenen in het zijpaneel</div>}

              {res30 && (
                <div style={{ background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid " + GOLD }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: DARKGOLD, marginBottom: 16 }}>30% Regeling - Triple glas</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: GOLD, color: "white" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Code</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Maatregel</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Hoev.</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Catalogus</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Subsidie 30%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(res30.data || []).map(r => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 700, color: GOLD }}>{r.id}</td>
                          <td style={{ padding: "6px 10px" }}>{r.attributes.name}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right" }}>{r.attributes.quantity} {r.attributes.unit}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right" }}>€ {r.attributes.totalForQuantity.toFixed(2)}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: GOLD, fontWeight: 700 }}>€ {(r.attributes.totalForQuantity * 0.30).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, padding: "12px 16px", background: "#fffdf0", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cataloguswaarde</span><span>€ {cat30.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: GOLD, fontSize: 15 }}><span>Subsidie (30%)</span><span>€ {sub30.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                    {parseFloat(off30) > 0 && <>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #eee", paddingTop: 6 }}><span>Schipper offerte</span><span>€ {parseFloat(off30).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                      {meerkostenTotaal > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#c0392b" }}><span>Meerkosten boven catalogus</span><span>€ {meerkostenTotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, color: RED }}><span>Eigen bijdrage klant</span><span>€ {(parseFloat(off30) - sub30 + meerkostenTotaal).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                    </>}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button onClick={() => schipperPDF("30")} style={{ flex: 1, padding: "10px", background: RED, color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📄 Schipper PDF</button>
                    <button onClick={() => nijBegunPDF("30")} disabled={pdfLoading} style={{ flex: 1, padding: "10px", background: GOLD, color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📋 Nij Begun PDF</button>
                  </div>
                </div>
              )}

              {res50 && (
                <div style={{ background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid " + RED }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: RED, marginBottom: 16 }}>{regeling === "100" ? "100%" : "50%"} Regeling - HR++ glas</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: RED, color: "white" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Code</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Maatregel</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Hoev.</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Catalogus</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Subsidie {regeling === "100" ? "100" : "50"}%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(res50.data || []).map(r => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 700, color: RED }}>{r.id}</td>
                          <td style={{ padding: "6px 10px" }}>{r.attributes.name}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right" }}>{r.attributes.quantity} {r.attributes.unit}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right" }}>€ {r.attributes.totalForQuantity.toFixed(2)}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: RED, fontWeight: 700 }}>€ {(r.attributes.totalForQuantity * pct50).toFixed(2)}</td>
                        </tr>
                      ))}
                      {codesAdd.length > 0 && addCosts.filter(ac => selAdd[ac.id]).map(ac => {
                        const prijs = type === "diy" ? ac.attributes.diyValuePerUnit : ac.attributes.contractorValuePerUnit;
                        return (
                          <tr key={ac.id} style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
                            <td style={{ padding: "6px 10px", fontWeight: 700, color: "#888" }}>{ac.id}</td>
                            <td style={{ padding: "6px 10px" }}>{ac.attributes.notes.replace("Betreft:", "").trim()}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right" }}>{selAdd[ac.id]} {ac.attributes.unit}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right" }}>€ {(prijs * selAdd[ac.id]).toFixed(2)}</td>
                            <td style={{ padding: "6px 10px", textAlign: "right", color: RED, fontWeight: 700 }}>€ {(prijs * selAdd[ac.id] * pct50).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {meerkostenTotaal > 0 && (
                        <>
                          <tr><td colSpan={5} style={{ padding: "8px 10px", fontWeight: 700, color: "#c0392b", background: "#fff5f5", fontSize: 11 }}>Meerkosten boven catalogus (niet subsidiabel)</td></tr>
                          {meerkosten.filter(m => m.omschrijving.trim() && parseFloat(m.bedrag) > 0).map((m, i) => (
                            <tr key={i} style={{ background: "#fff8f8", borderBottom: "1px solid #eee" }}>
                              <td colSpan={3} style={{ padding: "6px 10px", fontStyle: "italic", color: "#c0392b" }}>{m.omschrijving}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: "#c0392b" }}>€ {parseFloat(m.bedrag).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: "#aaa" }}>€ 0,00</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cataloguswaarde</span><span>€ {cat50v.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                    {addTotaal > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Bijkomende kosten</span><span>€ {addTotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: RED, fontSize: 15 }}><span>Subsidie ({regeling === "100" ? "100" : "50"}%)</span><span>€ {sub50.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                    {parseFloat(off50) > 0 && <>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #eee", paddingTop: 6 }}><span>Schipper offerte</span><span>€ {parseFloat(off50).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                      {meerkostenTotaal > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#c0392b" }}><span>Meerkosten boven catalogus</span><span>€ {meerkostenTotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, color: RED }}><span>Eigen bijdrage klant</span><span>€ {(parseFloat(off50) - sub50 + meerkostenTotaal).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>
                    </>}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button onClick={() => schipperPDF("50")} style={{ flex: 1, padding: "10px", background: RED, color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📄 Schipper PDF</button>
                    <button onClick={() => nijBegunPDF("50")} disabled={pdfLoading} style={{ flex: 1, padding: "10px", background: "#888", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📋 Nij Begun PDF</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ borderLeft: "1px solid #eee", background: "white", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa" }}>Samenvatting</div>

          {codes30.length > 0 && (
            <div style={{ background: "#fffdf0", borderRadius: 10, padding: "14px", border: "1px solid " + GOLD }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: DARKGOLD, marginBottom: 8 }}>30% Triple glas</div>
              {codes30.map(c => <div key={c} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ color: "#555" }}>{c}</span><span style={{ fontWeight: 600 }}>{sel30[c]}x</span></div>)}
              {sub30 != null && <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800, color: GOLD }}><span>Subsidie</span><span>€ {sub30.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>}
            </div>
          )}

          {codes50.length > 0 && (
            <div style={{ background: "#fff5f5", borderRadius: 10, padding: "14px", border: "1px solid " + RED }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: RED, marginBottom: 8 }}>{regeling === "100" ? "100%" : "50%"} HR++ glas</div>
              {codes50.map(c => <div key={c} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ color: "#555" }}>{c}</span><span style={{ fontWeight: 600 }}>{sel50[c]}x</span></div>)}
              {codesAdd.map(c => <div key={c} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ color: "#aaa" }}>{c}</span><span style={{ fontWeight: 600 }}>{selAdd[c]}x</span></div>)}
              {sub50 != null && <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800, color: RED }}><span>Subsidie</span><span>€ {sub50.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span></div>}
            </div>
          )}

          {meerkostenTotaal > 0 && (
            <div style={{ background: "#fff8f8", borderRadius: 10, padding: "14px", border: "1px solid #f5c6c6" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#c0392b", marginBottom: 8 }}>Meerkosten (eigen rekening)</div>
              {meerkosten.filter(m => m.omschrijving.trim() && parseFloat(m.bedrag) > 0).map((m, i) => (
                <div key={i} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#555", flex: 1, marginRight: 8 }}>{m.omschrijving}</span>
                  <span style={{ fontWeight: 600, color: "#c0392b" }}>€ {parseFloat(m.bedrag).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#c0392b" }}>
                <span>Totaal</span><span>€ {meerkostenTotaal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {calcError && <div style={{ background: "#fff0f0", border: "1px solid #f5c6c6", borderRadius: 8, padding: 12, fontSize: 12, color: RED }}>{calcError}</div>}

          <button
            onClick={calculate}
            disabled={calcLoading || (codes30.length === 0 && codes50.length === 0)}
            style={{ padding: "12px", background: codes30.length > 0 || codes50.length > 0 ? RED : "#ccc", color: "white", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: codes30.length > 0 || codes50.length > 0 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {calcLoading ? "Berekenen..." : "Bereken subsidie →"}
          </button>

          <div style={{ fontSize: 10, color: "#bbb", lineHeight: 1.6 }}>
            Selecteer maatregelen, vul hoeveelheden in en klik op Bereken. Resultaten verschijnen op het Resultaat tabblad.
          </div>
        </div>
      </div>
    </div>
  );
}

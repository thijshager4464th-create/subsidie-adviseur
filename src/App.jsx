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
const eur = (n) => "€ " + (Number(n) || 0).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function apiFetch(path) {
  const r = await fetch(API + path, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("API fout " + r.status);
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

function printPDF(opts) {
  const { klant, adres, postcode, projNr, pct, cat, subsidie, offerte, boven, eigen, rows, mkRows, datum } = opts;

  const rHTML = rows.map(r => "<tr><td>" + r.id + "</td><td>" + r.name + "</td><td style='text-align:right'>" + r.qty + " " + r.unit + "</td><td style='text-align:right'>" + eur(r.totaal) + "</td><td style='text-align:right'>" + eur(r.totaal * pct / 100) + "</td></tr>").join("");

  const mkHTML = mkRows.length > 0
    ? "<tr><td colspan='5' style='font-weight:700;padding-top:10px;color:#c0392b;background:#fff5f5'>Specificatie meerkosten boven maatregelcatalogus (niet subsidiabel)</td></tr>" +
      mkRows.map(m => "<tr style='background:#fff8f8'><td colspan='3' style='font-style:italic'>" + m.omschrijving + "</td><td style='text-align:right'>" + eur(m.bedrag) + "</td><td style='text-align:right;color:#c0392b'>€ 0,00</td></tr>").join("")
    : "";

  const bovenHTML = boven > 0 ? "<tr style='color:#c0392b'><td><strong>Meerkosten boven catalogusmaximum (eigen rekening, niet subsidiabel)</strong></td><td style='text-align:right'><strong>" + eur(boven) + "</strong></td></tr>" : "";
  const offerteHTML = offerte > 0 ? "<tr><td>Schipper Kozijnen offerte totaal</td><td style='text-align:right'>" + eur(offerte) + "</td></tr>" : "";
  const eigenHTML = offerte > 0 ? "<tr class='totaal'><td><strong>Eigen bijdrage klant totaal</strong></td><td style='text-align:right;color:#c0392b'><strong>" + eur(eigen) + "</strong></td></tr>" : "";

  const win = window.open("", "_blank");
  win.document.write("<!DOCTYPE html><html lang='nl'><head><meta charset='UTF-8'><title>Subsidieoverzicht - " + klant + "</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Segoe UI,sans-serif;padding:40px;font-size:13px;color:#1a1a2e}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #E31E24;padding-bottom:16px;margin-bottom:24px}.logo{height:48px}.meta{text-align:right;font-size:12px;color:#555}.projnr{display:inline-block;background:#E31E24;color:white;padding:3px 10px;border-radius:4px;font-weight:700;font-size:12px;margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#E31E24;color:white}th{padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase}tbody tr{border-bottom:1px solid #eee}td{padding:8px 12px}.totaal{font-weight:800;font-size:15px;background:#fff0f0}.waarschuwing{background:#fff8f0;border:2px solid #f0a000;border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px;color:#7d4000;line-height:1.8;font-weight:600}.conform{background:#fff0f0;border:2px solid #E31E24;border-radius:8px;padding:16px;margin-bottom:20px;font-size:12px;color:#8B0000;line-height:1.8}.disc{font-size:11px;color:#888;border-top:1px solid #eee;padding-top:14px}@media print{body{padding:20px}}</style></head><body>");
  win.document.write("<div class='header'><img src='https://subsidie-adviseur.vercel.app/images.png' class='logo' alt='Schipper Kozijnen' /><div class='meta'>" + (projNr ? "<span class='projnr'>Project: " + projNr + "</span><br>" : "") + "<strong>" + klant + "</strong><br>" + adres + "<br>" + postcode + "<br>Datum: " + datum + "</div></div>");
  win.document.write("<table><thead><tr><th>Code</th><th>Maatregel</th><th style='text-align:right'>Hoev.</th><th style='text-align:right'>Catalogus</th><th style='text-align:right'>Subsidie " + pct + "%</th></tr></thead><tbody>" + rHTML + mkHTML + "</tbody></table>");
  win.document.write("<table><tbody><tr><td>Cataloguswaarde maatregelen</td><td style='text-align:right'>" + eur(cat) + "</td></tr>" + bovenHTML + offerteHTML + "<tr><td><strong>Subsidie (" + pct + "%)</strong></td><td style='text-align:right'><strong>" + eur(subsidie) + "</strong></td></tr>" + eigenHTML + "</tbody></table>");
  win.document.write("<div class='waarschuwing'>LET OP: Dit overzicht is een INDICATIEVE berekening. De definitieve subsidie wordt vastgesteld door SNN na beoordeling van de volledige aanvraag. Aan dit document kunnen geen rechten worden ontleend. Schipper Kozijnen is niet verantwoordelijk voor het uiteindelijke subsidiebedrag.</div>");
  win.document.write("<div class='conform'>Deze offerte/factuur voldoet aan de voorwaarden van de maximale prijzen zoals deze zijn vastgesteld in de Maatregelencatalogus van de Isolatieaanpak Nij Begun. Het deel boven de catalogusprijs is voor rekening van de woningeigenaar en is niet subsidiabel.</div>");
  win.document.write("<div class='disc'>Schipper Kozijnen - Subsidieoverzicht gegenereerd via Nij Begun Maatregelencatalogus</div>");
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
  const [regeling, setRegeling] = useState("50");
  const [sel30, setSel30] = useState({});
  const [sel50, setSel50] = useState({});
  const [selAdd, setSelAdd] = useState({});
  const [tab, setTab] = useState("invoer");
  const [off30, setOff30] = useState("");
  const [off50, setOff50] = useState("");
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

  const tog30 = (c) => setSel30(p => { const n = { ...p }; if (n[c] !== undefined) delete n[c]; else n[c] = 1; return n; });
  const tog50 = (c) => setSel50(p => { const n = { ...p }; if (n[c] !== undefined) delete n[c]; else n[c] = 1; return n; });
  const togAdd = (c) => setSelAdd(p => { const n = { ...p }; if (n[c] !== undefined) delete n[c]; else n[c] = 1; return n; });
  const qty30 = (c, v) => setSel30(p => ({ ...p, [c]: Math.max(0, Number(v)) }));
  const qty50 = (c, v) => setSel50(p => ({ ...p, [c]: Math.max(0, Number(v)) }));
  const qtyAdd = (c, v) => setSelAdd(p => ({ ...p, [c]: Math.max(0, Number(v)) }));

  const unitCost = (m) => m?.attributes?.regularCosts?.[0]?.attributes?.contractorValuePerUnit ?? 0;
  const acCost = (ac) => ac?.attributes?.contractorValuePerUnit ?? 0;

  // LIVE berekeningen — geen API call meer nodig
  const cat30 = codes30.reduce((s, c) => s + unitCost(m30.find(x => x.id === c)) * (sel30[c] || 0), 0);
  const catMaatregelen50 = codes50.reduce((s, c) => s + unitCost(m50.find(x => x.id === c)) * (sel50[c] || 0), 0);
  const addTotaal = codesAdd.reduce((s, c) => s + acCost(addCosts.find(x => x.id === c)) * (selAdd[c] || 0), 0);
  const cat50 = catMaatregelen50 + addTotaal;

  const pct50 = regeling === "100" ? 100 : 50;
  const sub30 = cat30 * 0.30;
  const sub50 = cat50 * pct50 / 100;

  const o30 = parseFloat(off30) || 0;
  const o50 = parseFloat(off50) || 0;
  const boven30 = Math.max(0, o30 - cat30);
  const boven50 = Math.max(0, o50 - cat50);
  const eigen30 = o30 - sub30;
  const eigen50 = o50 - sub50;

  const mkTotaal = meerkosten.reduce((s, m) => s + (parseFloat(m.bedrag) || 0), 0);
  const teSpecificeren = boven30 + boven50;
  const nogTeSpec = teSpecificeren - mkTotaal;

  const voegMeerkostToe = () => setMeerkosten(m => [...m, { omschrijving: "", bedrag: "" }]);
  const verwijderMeerkosten = (i) => setMeerkosten(m => m.filter((_, j) => j !== i));
  const updateMeerkosten = (i, field, val) => setMeerkosten(m => m.map((x, j) => j === i ? { ...x, [field]: val } : x));

  const rows30 = codes30.map(c => {
    const m = m30.find(x => x.id === c);
    return { id: c, name: m.attributes.name, qty: sel30[c] || 0, unit: m.attributes.unit, totaal: unitCost(m) * (sel30[c] || 0) };
  });
  const rows50 = [
    ...codes50.map(c => {
      const m = m50.find(x => x.id === c);
      return { id: c, name: m.attributes.name, qty: sel50[c] || 0, unit: m.attributes.unit, totaal: unitCost(m) * (sel50[c] || 0) };
    }),
    ...codesAdd.map(c => {
      const ac = addCosts.find(x => x.id === c);
      return { id: c, name: ac.attributes.notes.replace("Betreft:", "").trim(), qty: selAdd[c] || 0, unit: ac.attributes.unit, totaal: acCost(ac) * (selAdd[c] || 0) };
    })
  ];

  const schipperPDF = (rt) => {
    const mkRows = meerkosten.filter(m => m.omschrijving.trim() && parseFloat(m.bedrag) > 0).map(m => ({ omschrijving: m.omschrijving, bedrag: parseFloat(m.bedrag) }));
    const datum = new Date().toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
    if (rt === "30") {
      printPDF({ klant: klant || "Klant", adres, postcode, projNr, pct: 30, cat: cat30, subsidie: sub30, offerte: o30, boven: boven30, eigen: eigen30, rows: rows30, mkRows, datum });
    } else {
      printPDF({ klant: klant || "Klant", adres, postcode, projNr, pct: pct50, cat: cat50, subsidie: sub50, offerte: o50, boven: boven50, eigen: eigen50, rows: rows50, mkRows, datum });
    }
  };

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
      <div style={{ background: "linear-gradient(135deg," + DARKRED + "," + RED + ")", color: "white", padding: "12px 28px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 4px 20px rgba(227,30,36,0.3)" }}>
        <div style={{ background: "white", borderRadius: 6, padding: "3px 8px", display: "flex", alignItems: "center" }}>
          <img src="/images.png" alt="Schipper Kozijnen" style={{ height: 36 }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.3px" }}>Subsidieadviseur</div>
          <div style={{ fontSize: 10, opacity: 0.75, marginTop: 1 }}>{measures.length + " maatregelen geladen via Nij Begun catalogus"}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", minHeight: "calc(100vh - 64px)" }}>
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
            {[["invoer", "Maatregelen"], ["resultaat", "Resultaat"]].map(([t, label]) => (
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
                  <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{sub30 > 0 ? "Subsidie: " + eur(sub30) : codes30.length + " geselecteerd"}</div>
                </div>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(g30).map(([sub, items]) => (
                    <div key={sub}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: DARKGOLD, marginBottom: 8 }}>{sub}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {items.map(m => (
                          <Kaart key={m.id} id={m.id} name={m.attributes.name} unit={m.attributes.unit} unitCost={unitCost(m)} isSelected={!!sel30[m.id]} onToggle={tog30} onQtyChange={qty30} qty={sel30[m.id]} color={GOLD} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ background: "linear-gradient(135deg," + DARKRED + "," + RED + ")", color: "white", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{pct50}% Regeling - HR++ glas</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Vervangen kozijn met HR++ glas</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", background: "rgba(255,255,255,0.15)", borderRadius: 6, overflow: "hidden" }}>
                      {[["50", "50%"], ["100", "100%"]].map(([v, label]) => (
                        <button key={v} onClick={() => setRegeling(v)} style={{ padding: "4px 10px", border: "none", background: regeling === v ? "rgba(255,255,255,0.3)" : "transparent", color: "white", fontSize: 11, fontWeight: regeling === v ? 800 : 400, cursor: "pointer" }}>{label}</button>
                      ))}
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{sub50 > 0 ? "Subsidie: " + eur(sub50) : codes50.length + " geselecteerd"}</div>
                  </div>
                </div>
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(g50).map(([sub, items]) => (
                    <div key={sub}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: RED, marginBottom: 8 }}>{sub}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {items.map(m => (
                          <Kaart key={m.id} id={m.id} name={m.attributes.name} unit={m.attributes.unit} unitCost={unitCost(m)} isSelected={!!sel50[m.id]} onToggle={tog50} onQtyChange={qty50} qty={sel50[m.id]} color={RED} />
                        ))}
                      </div>
                    </div>
                  ))}

                  {addCosts.length > 0 && (
                    <div style={{ marginTop: 8, borderTop: "1px dashed #eee", paddingTop: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: 8 }}>Bijkomende kosten ({pct50}% subsidiabel)</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {addCosts.map(ac => (
                          <Kaart key={ac.id} id={ac.id} name={ac.attributes.notes.replace("Betreft:", "").trim()} unit={ac.attributes.unit} unitCost={acCost(ac)} isSelected={!!selAdd[ac.id]} onToggle={togAdd} onQtyChange={qtyAdd} qty={selAdd[ac.id]} color={RED} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ background: "linear-gradient(135deg,#7d2a2a,#c0392b)", color: "white", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>Meerkosten boven maatregelcatalogus</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Specificeer het verschil tussen offerte en cataloguswaarde</div>
                  </div>
                  {teSpecificeren > 0 && (
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>Te specificeren: {eur(teSpecificeren)}</div>
                  )}
                </div>
                <div style={{ padding: "16px 20px" }}>
                  {teSpecificeren <= 0 && (
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 14, lineHeight: 1.6 }}>
                      Vul eerst het offertebedrag in (zijpaneel rechts). Als de offerte hoger is dan de cataloguswaarde, verschijnt hier het bedrag dat je moet specificeren.
                    </div>
                  )}
                  {meerkosten.map((mk, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                      <input value={mk.omschrijving} onChange={e => updateMeerkosten(i, "omschrijving", e.target.value)} placeholder="Omschrijving, bijv. luxe beslag, speciale kleur..." style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #dde", borderRadius: 8, fontSize: 13, outline: "none" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 13, color: "#888", fontWeight: 700 }}>€</span>
                        <input type="number" min="0" value={mk.bedrag} onChange={e => updateMeerkosten(i, "bedrag", e.target.value)} placeholder="0,00" style={{ width: 100, padding: "8px 10px", border: "1.5px solid #dde", borderRadius: 8, fontSize: 13, outline: "none", textAlign: "right" }} />
                      </div>
                      {meerkosten.length > 1 && (
                        <button onClick={() => verwijderMeerkosten(i)} style={{ padding: "8px 10px", borderRadius: 8, border: "1.5px solid #dde", background: "white", color: "#aaa", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={voegMeerkostToe} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px dashed #c0392b", background: "white", color: "#c0392b", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>+ Regel toevoegen</button>
                  {teSpecificeren > 0 && (
                    <div style={{ marginTop: 12, padding: "10px 14px", background: Math.abs(nogTeSpec) < 0.01 ? "#f0fff4" : "#fff5f5", borderRadius: 8, border: Math.abs(nogTeSpec) < 0.01 ? "1px solid #a8e6c0" : "1px solid #f5c6c6", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: Math.abs(nogTeSpec) < 0.01 ? "#2D6A4F" : "#c0392b" }}>
                      <span>{Math.abs(nogTeSpec) < 0.01 ? "✓ Volledig gespecificeerd" : nogTeSpec > 0 ? "Nog te specificeren" : "Te veel gespecificeerd"}</span>
                      <span>{Math.abs(nogTeSpec) < 0.01 ? eur(mkTotaal) : eur(Math.abs(nogTeSpec))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {tab === "resultaat" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {codes30.length === 0 && codes50.length === 0 && (
                <div style={{ background: "white", borderRadius: 12, padding: "32px", textAlign: "center", color: "#888" }}>Selecteer eerst maatregelen op het Maatregelen tabblad</div>
              )}

              {codes30.length > 0 && (
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
                      {rows30.map(r => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 700, color: GOLD }}>{r.id}</td>
                          <td style={{ padding: "6px 10px" }}>{r.name}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right" }}>{r.qty} {r.unit}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right" }}>{eur(r.totaal)}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: GOLD, fontWeight: 700 }}>{eur(r.totaal * 0.30)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, padding: "12px 16px", background: "#fffdf0", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cataloguswaarde</span><span>{eur(cat30)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: GOLD, fontSize: 15 }}><span>Subsidie (30%)</span><span>{eur(sub30)}</span></div>
                    {o30 > 0 && <>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #eee", paddingTop: 6 }}><span>Schipper offerte</span><span>{eur(o30)}</span></div>
                      {boven30 > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#c0392b" }}><span>Meerkosten boven catalogus (niet subsidiabel)</span><span>{eur(boven30)}</span></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, color: RED }}><span>Eigen bijdrage klant</span><span>{eur(eigen30)}</span></div>
                    </>}
                  </div>
                  <button onClick={() => schipperPDF("30")} style={{ width: "100%", marginTop: 14, padding: "10px", background: RED, color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📄 Genereer Schipper PDF</button>
                </div>
              )}

              {codes50.length > 0 && (
                <div style={{ background: "white", borderRadius: 12, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid " + RED }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: RED, marginBottom: 16 }}>{pct50}% Regeling - HR++ glas</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: RED, color: "white" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Code</th>
                        <th style={{ padding: "6px 10px", textAlign: "left" }}>Maatregel</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Hoev.</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Catalogus</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Subsidie {pct50}%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows50.map(r => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 700, color: RED }}>{r.id}</td>
                          <td style={{ padding: "6px 10px" }}>{r.name}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right" }}>{r.qty} {r.unit}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right" }}>{eur(r.totaal)}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: RED, fontWeight: 700 }}>{eur(r.totaal * pct50 / 100)}</td>
                        </tr>
                      ))}
                      {mkTotaal > 0 && (
                        <>
                          <tr><td colSpan={5} style={{ padding: "8px 10px", fontWeight: 700, color: "#c0392b", background: "#fff5f5", fontSize: 11 }}>Specificatie meerkosten boven catalogus (niet subsidiabel)</td></tr>
                          {meerkosten.filter(m => m.omschrijving.trim() && parseFloat(m.bedrag) > 0).map((m, i) => (
                            <tr key={i} style={{ background: "#fff8f8", borderBottom: "1px solid #eee" }}>
                              <td colSpan={3} style={{ padding: "6px 10px", fontStyle: "italic", color: "#c0392b" }}>{m.omschrijving}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: "#c0392b" }}>{eur(m.bedrag)}</td>
                              <td style={{ padding: "6px 10px", textAlign: "right", color: "#aaa" }}>€ 0,00</td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cataloguswaarde (incl. bijkomende kosten)</span><span>{eur(cat50)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: RED, fontSize: 15 }}><span>Subsidie ({pct50}%)</span><span>{eur(sub50)}</span></div>
                    {o50 > 0 && <>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #eee", paddingTop: 6 }}><span>Schipper offerte</span><span>{eur(o50)}</span></div>
                      {boven50 > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#c0392b" }}><span>Meerkosten boven catalogus (niet subsidiabel)</span><span>{eur(boven50)}</span></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14, color: RED }}><span>Eigen bijdrage klant</span><span>{eur(eigen50)}</span></div>
                    </>}
                  </div>
                  <button onClick={() => schipperPDF("50")} style={{ width: "100%", marginTop: 14, padding: "10px", background: RED, color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📄 Genereer Schipper PDF</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ borderLeft: "1px solid #eee", background: "white", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa" }}>Live overzicht</div>

          {codes30.length === 0 && codes50.length === 0 && (
            <div style={{ fontSize: 12, color: "#bbb", lineHeight: 1.6 }}>Selecteer maatregelen — de subsidie verschijnt hier direct.</div>
          )}

          {codes30.length > 0 && (
            <div style={{ background: "#fffdf0", borderRadius: 10, padding: "14px", border: "1px solid " + GOLD }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: DARKGOLD, marginBottom: 8 }}>30% Triple glas</div>
              <div style={{ fontSize: 12, display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Cataloguswaarde</span><span style={{ fontWeight: 600 }}>{eur(cat30)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: GOLD, marginBottom: 10 }}><span>Subsidie</span><span>{eur(sub30)}</span></div>
              <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Offerte incl. BTW</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 700, color: "#555", fontSize: 13 }}>€</span>
                <input type="number" value={off30} onChange={e => setOff30(e.target.value)} placeholder="0,00" style={{ flex: 1, padding: "7px 10px", border: "1.5px solid " + GOLD, borderRadius: 8, fontSize: 13, outline: "none" }} />
              </div>
              {o30 > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee", fontSize: 12 }}>
                  {boven30 > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#c0392b", marginBottom: 4 }}><span>Boven catalogus</span><span>{eur(boven30)}</span></div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: RED }}><span>Eigen bijdrage</span><span>{eur(eigen30)}</span></div>
                </div>
              )}
            </div>
          )}

          {codes50.length > 0 && (
            <div style={{ background: "#fff5f5", borderRadius: 10, padding: "14px", border: "1px solid " + RED }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: RED, marginBottom: 8 }}>{pct50}% HR++ glas</div>
              <div style={{ fontSize: 12, display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Cataloguswaarde</span><span style={{ fontWeight: 600 }}>{eur(cat50)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: RED, marginBottom: 10 }}><span>Subsidie</span><span>{eur(sub50)}</span></div>
              <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Offerte incl. BTW</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 700, color: "#555", fontSize: 13 }}>€</span>
                <input type="number" value={off50} onChange={e => setOff50(e.target.value)} placeholder="0,00" style={{ flex: 1, padding: "7px 10px", border: "1.5px solid " + RED, borderRadius: 8, fontSize: 13, outline: "none" }} />
              </div>
              {o50 > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee", fontSize: 12 }}>
                  {boven50 > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#c0392b", marginBottom: 4 }}><span>Boven catalogus</span><span>{eur(boven50)}</span></div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: RED }}><span>Eigen bijdrage</span><span>{eur(eigen50)}</span></div>
                </div>
              )}
            </div>
          )}

          {teSpecificeren > 0 && (
            <div style={{ background: Math.abs(nogTeSpec) < 0.01 ? "#f0fff4" : "#fff8f8", borderRadius: 10, padding: "14px", border: Math.abs(nogTeSpec) < 0.01 ? "1px solid #a8e6c0" : "1px solid #f5c6c6" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: Math.abs(nogTeSpec) < 0.01 ? "#2D6A4F" : "#c0392b", marginBottom: 8 }}>Meerkosten specificatie</div>
              <div style={{ fontSize: 12, display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Te specificeren</span><span style={{ fontWeight: 600 }}>{eur(teSpecificeren)}</span></div>
              <div style={{ fontSize: 12, display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Gespecificeerd</span><span style={{ fontWeight: 600 }}>{eur(mkTotaal)}</span></div>
              <div style={{ borderTop: "1px solid #eee", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 800, color: Math.abs(nogTeSpec) < 0.01 ? "#2D6A4F" : "#c0392b", fontSize: 13 }}>
                <span>{Math.abs(nogTeSpec) < 0.01 ? "✓ Compleet" : "Nog open"}</span>
                <span>{Math.abs(nogTeSpec) < 0.01 ? "" : eur(Math.abs(nogTeSpec))}</span>
              </div>
            </div>
          )}

          <div style={{ fontSize: 10, color: "#bbb", lineHeight: 1.6 }}>
            Alles wordt live berekend. Vul offertebedrag in, specificeer eventuele meerkosten en genereer de PDF via het Resultaat tabblad.
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Research, FormField, Response } from "@/lib/types";

const BRD = "1px solid #e8d9c0";
const TS  = { color: "#b07d20", fontSize: "9px" } as const;

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function ResponsesClient({
  research,
  fields,
  responses,
}: {
  research: Research;
  fields: FormField[];
  responses: Response[];
}) {
  const [search,        setSearch]        = useState("");
  const [selectedIdx,   setSelectedIdx]   = useState<number | null>(null);
  const [view,          setView]          = useState<"table" | "cards">("table");

  function buildRows() {
    const headers = ["#", "Data", "Status", "Offline", "Latitude", "Longitude",
      ...questionFields.map((f, i) => `P${i + 1} — ${f.label}`)];
    const rows = responses.map((r, idx) => {
      const data = r.data as Record<string, unknown>;
      return [
        String(idx + 1),
        formatDate(r.createdAt),
        r.completed ? "Completa" : "Incompleta",
        r.collectedOffline ? "Sim" : "Não",
        String(r.latitude ?? ""),
        String(r.longitude ?? ""),
        ...questionFields.map(f => {
          const val = data[f.id];
          if (Array.isArray(val)) return val.join("; ");
          return String(val ?? "");
        }),
      ];
    });
    return { headers, rows };
  }

  function exportCSV() {
    if (responses.length === 0) return;
    const { headers, rows } = buildRows();
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${research.title}-respostas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportXLSX() {
    if (responses.length === 0) return;
    const { headers, rows } = buildRows();
    const allRows = [headers, ...rows];

    // Escape XML
    const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

    // Larguras de coluna
    const colWidths = headers.map((h, i) =>
      Math.min(Math.max(h.length, ...rows.map(r => r[i].length)) + 2, 40)
    );

    // Sheet XML
    const sheetRows = allRows.map((row, ri) =>
      `<row r="${ri+1}">${row.map((cell, ci) => {
        const col = ci < 26 ? String.fromCharCode(65+ci) : String.fromCharCode(64+Math.floor(ci/26))+String.fromCharCode(65+(ci%26));
        const s = ri === 0 ? ' s="1"' : '';
        return `<c r="${col}${ri+1}" t="inlineStr"${s}><is><t>${esc(cell)}</t></is></c>`;
      }).join("")}</row>`
    ).join("");

    const colsXml = colWidths.map((w,i) =>
      `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`
    ).join("");

    const sheetXml = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${colsXml}</cols><sheetData>${sheetRows}</sheetData></worksheet>`;
    const stylesXml = `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts><font><sz val="11"/></font><font><sz val="11"/><b/></font></fonts><fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF8EC"/></patternFill></fill></fills><borders><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;
    const wbXml = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Respostas" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const relsXml = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
    const appRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

    // CRC32
    const crcTable = new Uint32Array(256);
    for (let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[i]=c;}
    function crc32(d:Uint8Array){let c=0xffffffff;for(const b of d)c=crcTable[(c^b)&0xff]^(c>>>8);return(c^0xffffffff)>>>0;}

    const enc = (s:string)=>new TextEncoder().encode(s);

    function makeZip(files:{name:string;data:Uint8Array}[]){
      const parts:Uint8Array[]=[];
      const cd:Uint8Array[]=[];
      let off=0;
      for(const {name,data} of files){
        const nb=enc(name);
        const lh=new Uint8Array(30+nb.length);
        const lv=new DataView(lh.buffer);
        lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0,true);
        lv.setUint16(8,0,true);lv.setUint16(10,0,true);lv.setUint16(12,0,true);
        lv.setUint32(14,crc32(data),true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);
        lv.setUint16(26,nb.length,true);lv.setUint16(28,0,true);lh.set(nb,30);
        const ce=new Uint8Array(46+nb.length);
        const cv=new DataView(ce.buffer);
        cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);
        cv.setUint16(8,0,true);cv.setUint16(10,0,true);cv.setUint16(12,0,true);cv.setUint16(14,0,true);
        cv.setUint32(16,crc32(data),true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);
        cv.setUint16(28,nb.length,true);cv.setUint16(30,0,true);cv.setUint16(32,0,true);
        cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,off,true);
        ce.set(nb,46);
        parts.push(lh,data);cd.push(ce);off+=lh.length+data.length;
      }
      const cds=cd.reduce((s,b)=>s+b.length,0);
      const eo=new Uint8Array(22);const ev=new DataView(eo.buffer);
      ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true);
      ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
      ev.setUint32(12,cds,true);ev.setUint32(16,off,true);ev.setUint16(20,0,true);
      const all=[...parts,...cd,eo];
      const tot=all.reduce((s,b)=>s+b.length,0);
      const out=new Uint8Array(tot);let pos=0;
      for(const b of all){out.set(b,pos);pos+=b.length;}
      return out;
    }

    const zip = makeZip([
      {name:"[Content_Types].xml",       data:enc(contentTypes)},
      {name:"_rels/.rels",               data:enc(appRels)},
      {name:"xl/workbook.xml",           data:enc(wbXml)},
      {name:"xl/_rels/workbook.xml.rels",data:enc(relsXml)},
      {name:"xl/worksheets/sheet1.xml",  data:enc(sheetXml)},
      {name:"xl/styles.xml",             data:enc(stylesXml)},
    ]);

    const blob = new Blob([zip],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`${research.title}-respostas.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }


  // Filtra campos visíveis (ignora seção e instrução)
  const questionFields = fields.filter(
    f => (f.type as string) !== "section" && (f.type as string) !== "instruction"
  );

  // Respostas filtradas por busca
  const filtered = useMemo(() => {
    if (!search.trim()) return responses;
    const q = search.toLowerCase();
    return responses.filter(r => {
      const data = r.data as Record<string, unknown>;
      return Object.values(data).some(v =>
        String(v ?? "").toLowerCase().includes(q)
      );
    });
  }, [responses, search]);

  const selectedResponse = selectedIdx !== null ? filtered[selectedIdx] : null;

  // Métricas
  const total     = responses.length;
  const completed = responses.filter(r => r.completed).length;
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex-1 overflow-auto" style={{ background: "#fff" }}>
      <div className="p-6 max-w-6xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs mb-5" style={{ color: "#8b7355" }}>
          <Link href="/dashboard" className="hover:underline" style={{ color: "#b07d20" }}>Início</Link>
          <i className="ti ti-chevron-right text-xs" />
          <Link href={`/researches/${research.id}`} className="hover:underline" style={{ color: "#b07d20" }}>{research.title}</Link>
          <i className="ti ti-chevron-right text-xs" />
          <span style={{ color: "#5c4a2a" }}>Respostas</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded mb-2 text-xs font-bold uppercase tracking-widest"
              style={{ background: "#fff8ec", border: BRD, color: "#5c4a2a" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#b07d20" }} />
              Respostas coletadas
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0a1628", fontFamily: "Georgia, serif", letterSpacing: "-0.4px" }}>
              {research.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(view === "table" ? "cards" : "table")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold"
              style={{ border: BRD, background: "#faf6ef", color: "#5c4a2a" }}>
              <i className={`ti ${view === "table" ? "ti-layout-cards" : "ti-table"}`} />
              {view === "table" ? "Ver cards" : "Ver tabela"}
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold"
              style={{ border: BRD, background: "#faf6ef", color: "#5c4a2a" }}>
              <i className="ti ti-file-type-csv" /> CSV
            </button>
            <button
              onClick={exportXLSX}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold"
              style={{ border: BRD, background: "#e1f5ee", color: "#0a6e45" }}>
              <i className="ti ti-file-spreadsheet" /> Excel
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { val: total,      label: "Total de respostas",  icon: "ti-clipboard-list" },
            { val: completed,  label: "Respostas completas", icon: "ti-check" },
            { val: `${rate}%`, label: "Taxa de conclusão",   icon: "ti-chart-pie" },
          ].map(m => (
            <div key={m.label} className="rounded-xl p-4 flex items-center gap-3"
              style={{ border: BRD, background: "#faf6ef" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#fff8ec" }}>
                <i className={`ti ${m.icon} text-lg`} style={{ color: "#b07d20" }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>{m.val}</p>
                <p className="text-xs font-semibold" style={{ color: "#5c4a2a" }}>{m.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sem respostas */}
        {total === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{ border: `2px dashed #d4b880`, background: "#faf6ef" }}>
            <i className="ti ti-inbox text-4xl block mb-3" style={{ color: "#d4b880" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "#5c4a2a" }}>Nenhuma resposta ainda</p>
            <p className="text-xs mb-5" style={{ color: "#8b7355" }}>
              Compartilhe o link do formulário para começar a coletar dados
            </p>
            <Link href={`/researches/${research.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold"
              style={{ background: "#b07d20", color: "#fff" }}>
              <i className="ti ti-link" /> Ir para publicação
            </Link>
          </div>
        ) : (
          <>
            {/* Busca */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 relative">
                <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#b8a080" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar nas respostas..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none"
                  style={{ border: BRD, background: "#fff", color: "#111" }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: "#8b7355" }}>
                {filtered.length} de {total} respostas
              </span>
            </div>

            {/* Vista: Tabela */}
            {view === "table" && (
              <div className="rounded-xl overflow-hidden" style={{ border: BRD }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "#faf6ef", borderBottom: BRD }}>
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-widest whitespace-nowrap" style={TS}>#</th>
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-widest whitespace-nowrap" style={TS}>Data</th>
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-widest whitespace-nowrap" style={TS}>Status</th>
                        {questionFields.slice(0, 4).map(f => (
                          <th key={f.id} className="px-3 py-2.5 text-left font-bold uppercase tracking-widest" style={{ ...TS, maxWidth: "140px" }}>
                            <span className="truncate block" style={{ maxWidth: "120px" }}>{f.label}</span>
                          </th>
                        ))}
                        {questionFields.length > 4 && (
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-widest whitespace-nowrap" style={TS}>
                            +{questionFields.length - 4} campos
                          </th>
                        )}
                        <th className="px-3 py-2.5" style={TS}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, idx) => {
                        const data = r.data as Record<string, unknown>;
                        return (
                          <tr key={r.id}
                            style={{ borderBottom: BRD, background: selectedIdx === idx ? "#fff8ec" : "#fff", cursor: "pointer" }}
                            onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}>
                            <td className="px-3 py-2.5 font-bold" style={{ color: "#b07d20" }}>
                              #{idx + 1}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: "#5c4a2a" }}>
                              {formatDate(r.createdAt)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                                style={{ background: r.completed ? "#e1f5ee" : "#fff8ec", color: r.completed ? "#0a6e45" : "#7a3d00" }}>
                                {r.completed ? "Completa" : "Incompleta"}
                              </span>
                            </td>
                            {questionFields.slice(0, 4).map(f => (
                              <td key={f.id} className="px-3 py-2.5" style={{ color: "#5c4a2a", maxWidth: "140px" }}>
                                <span className="truncate block" style={{ maxWidth: "120px" }}>
                                  {formatValue(data[f.id])}
                                </span>
                              </td>
                            ))}
                            {questionFields.length > 4 && <td className="px-3 py-2.5" style={{ color: "#8b7355" }}>...</td>}
                            <td className="px-3 py-2.5">
                              <i className={`ti ${selectedIdx === idx ? "ti-chevron-up" : "ti-chevron-down"} text-xs`} style={{ color: "#b07d20" }} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vista: Cards */}
            {view === "cards" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map((r, idx) => {
                  const data = r.data as Record<string, unknown>;
                  return (
                    <div key={r.id}
                      className="rounded-xl p-4 cursor-pointer transition-all"
                      style={{
                        border: selectedIdx === idx ? "2px solid #b07d20" : BRD,
                        background: selectedIdx === idx ? "#fff8ec" : "#fff",
                      }}
                      onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold" style={{ color: "#b07d20" }}>Resposta #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ background: r.completed ? "#e1f5ee" : "#fff8ec", color: r.completed ? "#0a6e45" : "#7a3d00" }}>
                            {r.completed ? "Completa" : "Incompleta"}
                          </span>
                          <span className="text-xs" style={{ color: "#8b7355" }}>{formatDate(r.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {questionFields.slice(0, 3).map(f => (
                          <div key={f.id} className="flex items-start gap-2">
                            <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#5c4a2a", minWidth: "80px" }}>
                              {f.label.length > 20 ? f.label.slice(0, 20) + "..." : f.label}:
                            </span>
                            <span className="text-xs" style={{ color: "#8b7355" }}>
                              {formatValue(data[f.id])}
                            </span>
                          </div>
                        ))}
                        {questionFields.length > 3 && (
                          <p className="text-xs" style={{ color: "#b07d20" }}>
                            + {questionFields.length - 3} campos
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Painel de detalhes da resposta selecionada */}
            {selectedResponse && (
              <div className="mt-4 rounded-xl p-5" style={{ border: "2px solid #b07d20", background: "#faf6ef" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold" style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>
                    Resposta #{selectedIdx! + 1} — Detalhes completos
                  </h3>
                  <button onClick={() => setSelectedIdx(null)}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ border: BRD, background: "#fff", color: "#8b7355" }}>
                    <i className="ti ti-x text-xs" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Metadados */}
                  <div className="rounded-lg p-3" style={{ background: "#fff", border: BRD }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Metadados</p>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { label: "ID",         val: selectedResponse.id.slice(0, 8) + "..." },
                        { label: "Data",       val: formatDate(selectedResponse.createdAt) },
                        { label: "Status",     val: selectedResponse.completed ? "Completa" : "Incompleta" },
                        { label: "Offline",    val: selectedResponse.collectedOffline ? "Sim" : "Não" },
                        ...(selectedResponse.latitude ? [{ label: "GPS", val: `${selectedResponse.latitude}, ${selectedResponse.longitude}` }] : []),
                      ].map(m => (
                        <div key={m.label} className="flex items-center justify-between py-1" style={{ borderBottom: "0.5px solid #f0e8d8" }}>
                          <span className="text-xs font-semibold" style={{ color: "#5c4a2a" }}>{m.label}</span>
                          <span className="text-xs" style={{ color: "#8b7355" }}>{m.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Respostas */}
                  <div className="rounded-lg p-3" style={{ background: "#fff", border: BRD }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={TS}>Respostas</p>
                    <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: "200px" }}>
                      {questionFields.map(f => {
                        const data = selectedResponse.data as Record<string, unknown>;
                        const val = formatValue(data[f.id]);
                        return (
                          <div key={f.id} className="py-1.5" style={{ borderBottom: "0.5px solid #f0e8d8" }}>
                            <p className="text-xs font-semibold mb-0.5" style={{ color: "#5c4a2a" }}>{f.label}</p>
                            <p className="text-xs" style={{ color: val === "—" ? "#b8a080" : "#111" }}>{val}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

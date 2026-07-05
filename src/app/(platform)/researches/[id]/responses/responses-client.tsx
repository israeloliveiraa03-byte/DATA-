"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Research, FormField, Response } from "@/lib/types";

const TOOL_BTN = "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-ink-700 bg-ink-800 text-ink-300 hover:bg-ink-700 hover:text-ink-100 transition-colors duration-150";

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
    const stylesXml = `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts><font><sz val="11"/></font><font><sz val="11"/><b/></font></fonts><fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFBF3E7"/></patternFill></fill></fills><borders><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;
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
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="p-6 max-w-6xl mx-auto">

        {/* Breadcrumb */}
        <nav aria-label="Você está em" className="flex items-center gap-2 text-xs mb-5 text-ink-300 flex-wrap">
          <Link href="/dashboard" className="hover:underline text-brand-400">Início</Link>
          <i className="ti ti-chevron-right text-xs" aria-hidden="true" />
          <Link href={`/researches/${research.id}`} className="hover:underline text-brand-400 truncate max-w-[40%]">{research.title}</Link>
          <i className="ti ti-chevron-right text-xs" aria-hidden="true" />
          <span className="text-ink-100">Respostas</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded mb-2 text-xs font-bold uppercase tracking-widest font-condensed bg-ink-900 border border-ink-700 text-ink-300">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              Respostas coletadas
            </div>
            <h1 className="text-2xl font-bold font-condensed text-ink-100" style={{ letterSpacing: "-0.3px" }}>
              {research.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setView(view === "table" ? "cards" : "table")} className={TOOL_BTN}>
              <i className={`ti ${view === "table" ? "ti-layout-cards" : "ti-table"}`} aria-hidden="true" />
              {view === "table" ? "Ver cards" : "Ver tabela"}
            </button>
            <button onClick={exportCSV} className={TOOL_BTN}>
              <i className="ti ti-file-type-csv" aria-hidden="true" /> CSV
            </button>
            <button onClick={exportXLSX}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-teal-500/30 bg-teal-50/10 text-teal-500 hover:bg-teal-50/20 transition-colors duration-150">
              <i className="ti ti-file-spreadsheet" aria-hidden="true" /> Excel
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { val: total,      label: "Total de respostas",  icon: "ti-clipboard-list" },
            { val: completed,  label: "Respostas completas", icon: "ti-check" },
            { val: `${rate}%`, label: "Taxa de conclusão",   icon: "ti-chart-pie" },
          ].map(m => (
            <div key={m.label} className="rounded-lg p-4 flex items-center gap-3 border border-ink-700 bg-ink-900">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-ink-800">
                <i className={`ti ${m.icon} text-lg text-brand-400`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold font-condensed text-ink-100">{m.val}</p>
                <p className="text-xs font-semibold text-ink-300">{m.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sem respostas */}
        {total === 0 ? (
          <div className="text-center py-20 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
            <i className="ti ti-inbox text-4xl block mb-3 text-ink-500" aria-hidden="true" />
            <p className="text-sm font-semibold mb-1 text-ink-100">Nenhuma resposta ainda</p>
            <p className="text-xs mb-5 text-ink-300">
              Compartilhe o link do formulário para começar a coletar dados
            </p>
            <Link href={`/researches/${research.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold bg-brand-500 text-on-accent transition-colors duration-150">
              <i className="ti ti-link" aria-hidden="true" /> Ir para publicação
            </Link>
          </div>
        ) : (
          <>
            {/* Busca */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500" aria-hidden="true" />
                <label htmlFor="busca-respostas" className="sr-only">Buscar nas respostas</label>
                <input
                  id="busca-respostas"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar nas respostas..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-ink-700 bg-ink-900 text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <span className="text-xs font-medium text-ink-300">
                {filtered.length} de {total} respostas
              </span>
            </div>

            {/* Vista: Tabela */}
            {view === "table" && (
              <div className="rounded-lg overflow-hidden border border-ink-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[640px]">
                    <thead>
                      <tr className="bg-ink-900 border-b border-ink-700">
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-widest font-condensed whitespace-nowrap text-brand-400" style={{ fontSize: "9px" }}>#</th>
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-widest font-condensed whitespace-nowrap text-brand-400" style={{ fontSize: "9px" }}>Data</th>
                        <th className="px-3 py-2.5 text-left font-bold uppercase tracking-widest font-condensed whitespace-nowrap text-brand-400" style={{ fontSize: "9px" }}>Status</th>
                        {questionFields.slice(0, 4).map(f => (
                          <th key={f.id} className="px-3 py-2.5 text-left font-bold uppercase tracking-widest font-condensed text-brand-400" style={{ fontSize: "9px", maxWidth: "140px" }}>
                            <span className="truncate block" style={{ maxWidth: "120px" }}>{f.label}</span>
                          </th>
                        ))}
                        {questionFields.length > 4 && (
                          <th className="px-3 py-2.5 text-left font-bold uppercase tracking-widest font-condensed whitespace-nowrap text-brand-400" style={{ fontSize: "9px" }}>
                            +{questionFields.length - 4} campos
                          </th>
                        )}
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, idx) => {
                        const data = r.data as Record<string, unknown>;
                        return (
                          <tr key={r.id}
                            className={`border-b border-ink-700 cursor-pointer transition-colors duration-150 ${selectedIdx === idx ? "bg-ink-800" : "bg-ink-900 hover:bg-ink-800"}`}
                            onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}>
                            <td className="px-3 py-2.5 font-bold text-brand-400">
                              #{idx + 1}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-ink-100">
                              {formatDate(r.createdAt)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.completed ? "bg-teal-50/15 text-teal-500" : "bg-amber-50/15 text-amber-500"}`}>
                                {r.completed ? "Completa" : "Incompleta"}
                              </span>
                            </td>
                            {questionFields.slice(0, 4).map(f => (
                              <td key={f.id} className="px-3 py-2.5 text-ink-100" style={{ maxWidth: "140px" }}>
                                <span className="truncate block" style={{ maxWidth: "120px" }}>
                                  {formatValue(data[f.id])}
                                </span>
                              </td>
                            ))}
                            {questionFields.length > 4 && <td className="px-3 py-2.5 text-ink-300">...</td>}
                            <td className="px-3 py-2.5">
                              <i className={`ti ${selectedIdx === idx ? "ti-chevron-up" : "ti-chevron-down"} text-xs text-brand-400`} aria-hidden="true" />
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
                      className={`rounded-lg p-4 cursor-pointer transition-colors duration-150 border ${selectedIdx === idx ? "border-brand-500 bg-ink-800" : "border-ink-700 bg-ink-900"}`}
                      onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}>
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                        <span className="text-xs font-bold text-brand-400">Resposta #{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.completed ? "bg-teal-50/15 text-teal-500" : "bg-amber-50/15 text-amber-500"}`}>
                            {r.completed ? "Completa" : "Incompleta"}
                          </span>
                          <span className="text-xs text-ink-300">{formatDate(r.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {questionFields.slice(0, 3).map(f => (
                          <div key={f.id} className="flex items-start gap-2">
                            <span className="text-xs font-semibold flex-shrink-0 text-ink-100" style={{ minWidth: "80px" }}>
                              {f.label.length > 20 ? f.label.slice(0, 20) + "..." : f.label}:
                            </span>
                            <span className="text-xs text-ink-300">
                              {formatValue(data[f.id])}
                            </span>
                          </div>
                        ))}
                        {questionFields.length > 3 && (
                          <p className="text-xs text-brand-400">
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
              <div className="mt-4 rounded-lg p-5 border-2 border-brand-500 bg-ink-900">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                  <h3 className="text-sm font-bold font-condensed text-ink-100">
                    Resposta #{selectedIdx! + 1} — Detalhes completos
                  </h3>
                  <button onClick={() => setSelectedIdx(null)}
                    className="w-6 h-6 rounded-full flex items-center justify-center border border-ink-700 bg-ink-800 text-ink-300 hover:text-ink-100 transition-colors duration-150"
                    aria-label="Fechar detalhes">
                    <i className="ti ti-x text-xs" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Metadados */}
                  <div className="rounded-lg p-3 bg-ink-800 border border-ink-700">
                    <p className="text-xs font-bold uppercase tracking-widest font-condensed mb-2 text-brand-400">Metadados</p>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { label: "ID",         val: selectedResponse.id.slice(0, 8) + "..." },
                        { label: "Data",       val: formatDate(selectedResponse.createdAt) },
                        { label: "Status",     val: selectedResponse.completed ? "Completa" : "Incompleta" },
                        { label: "Offline",    val: selectedResponse.collectedOffline ? "Sim" : "Não" },
                        ...(selectedResponse.latitude ? [{ label: "GPS", val: `${selectedResponse.latitude}, ${selectedResponse.longitude}` }] : []),
                      ].map(m => (
                        <div key={m.label} className="flex items-center justify-between py-1 border-b border-ink-700 last:border-b-0">
                          <span className="text-xs font-semibold text-ink-100">{m.label}</span>
                          <span className="text-xs text-ink-300">{m.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Respostas */}
                  <div className="rounded-lg p-3 bg-ink-800 border border-ink-700">
                    <p className="text-xs font-bold uppercase tracking-widest font-condensed mb-2 text-brand-400">Respostas</p>
                    <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: "200px" }}>
                      {questionFields.map(f => {
                        const data = selectedResponse.data as Record<string, unknown>;
                        const val = formatValue(data[f.id]);
                        return (
                          <div key={f.id} className="py-1.5 border-b border-ink-700 last:border-b-0">
                            <p className="text-xs font-semibold mb-0.5 text-ink-100">{f.label}</p>
                            <p className={`text-xs ${val === "—" ? "text-ink-500" : "text-ink-300"}`}>{val}</p>
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

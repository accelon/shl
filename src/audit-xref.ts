#!/usr/bin/env bun
/**
 * xref 錨點審計：非 gap 的列，其 source_start 段落是否真的含有該條的 8 字片段。
 *
 *   bun run src/audit-xref.ts
 *
 * 這不是語義正確性，只抓「anchor 段落根本沒這條文字」的硬錯誤。
 * 產出 data/xref-audit.json。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBook, normHan } from './lib/book';
import { parseJcXml } from './lib/jcbook';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');
const FILES: Record<string, string> = {
  ZJ: 'zhujie', KP: 'kangping', GL: 'guilin', YH: 'yuhan', TB: '傷寒論條辨', SL: '尚論篇',
  LSZ: '傷寒論註來蘇集', GZ: '傷寒貫珠集', QZ: '傷寒論淺註補正', JY: '傷寒論輯義',
  JC: '傷寒論集成', SYJ: '傷寒溯源集', XJ: '傷寒懸解', GM: '傷寒論綱目', ZZ: '張卿子傷寒論',
  HZ: '傷寒論彙註精華', LF: '傷寒論類方', HR: '類證活人書',
  MJ: 'maijing', QY: 'qianjin', WT: '外臺秘要', SHF: '太平聖惠方',
  BW: '仲景傷寒補亡論', CYF: '曹氏傷寒金匱發微合刊',
};

const x = readFileSync(join(DATA, 'xref.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const tr = readFileSync(join(DATA, 'tracks-zh.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const ct = new Map<string, string>();
for (const r of tr) if (r[4] === 'clause') ct.set(r[1]!, (ct.get(r[1]!) ?? '') + r[11]);

const byW = new Map<string, string[][]>();
for (const r of x) {
  if (r[6] === 'gap') continue;
  if (!byW.has(r[0]!)) byW.set(r[0]!, []);
  byW.get(r[0]!).push(r);
}

const out: Record<string, { rows: number; hit: number; pct: number; A: number; Ahit: number }> = {};
for (const [w, rows] of byW) {
  const book = w === 'BW' || w === 'CYF'
    ? { paras: parseJcXml(join(ROOT, 'out', 'jc-books', `${FILES[w]}.xml`)) }
    : parseBook(join(DATA, 'sources', `${FILES[w]}.html`));
  const m = new Map<string, (typeof book.paras)[number]>();
  for (const p of book.paras) {
    m.set(p.id || `p${p.idx}`, p);
    m.set(`p${p.idx}`, p);
  }
  let hit = 0, A = 0, Ahit = 0;
  for (const r of rows) {
    const p = m.get(r[1]!);
    if (!p) continue;
    const c0 = +r[4]!.slice(1, 5);
    const c = normHan(ct.get(`S${String(c0).padStart(4, '0')}`) ?? '');
    const t = normHan(p.text);
    let ok = false;
    for (let i = 0; i + 8 <= c.length; i++) if (t.includes(c.slice(i, i + 8))) { ok = true; break; }
    if (ok) hit++;
    if (r[7] === 'A') { A++; if (ok) Ahit++; }
  }
  out[w] = { rows: rows.length, hit, pct: +((hit / rows.length) * 100).toFixed(1), A, Ahit };
}

writeFileSync(join(DATA, 'xref-audit.json'), JSON.stringify(out, null, 2) + '\n');
for (const [w, v] of Object.entries(out)) console.log(`${w}\t${v.rows}\t${v.pct}%\tA ${v.Ahit}/${v.A}`);

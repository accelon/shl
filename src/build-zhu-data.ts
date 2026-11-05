#!/usr/bin/env bun
/**
 * 把 shl 資料轉成 zhu-combined 閱讀器要的 window.ZHU（條級 prototype）。
 *
 *   bun run src/build-zhu-data.ts
 *
 * 產出 out/proto/zhu-data.js；再用 zhu-combined/build-vcpp.mjs 打包。
 * 8 家：ZJ、TB、SL、LSZ、GZ、QZ、JY、JC。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBook } from './lib/book';
import { splitSentences } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');
const CLAUSE = process.argv.includes('--clause');
const NO_GLOSS = process.argv.includes('--no-glossary');
const OUT = join(ROOT, 'out', CLAUSE ? 'proto-clause' : 'proto');
mkdirSync(OUT, { recursive: true });

const WORKS = ['ZJ', 'TB', 'SL', 'LSZ', 'GZ', 'QZ', 'JY', 'JC'] as const;
const FILES: Record<string, string> = {
  ZJ: 'zhujie', TB: '傷寒論條辨', SL: '尚論篇', LSZ: '傷寒論註來蘇集',
  GZ: '傷寒貫珠集', QZ: '傷寒論淺註補正', JY: '傷寒論輯義', JC: '傷寒論集成',
};

const tsv = (f: string) => readFileSync(join(DATA, f), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const tracks = tsv('tracks-zh.tsv');
const secRows = tsv('sections.tsv');
const wit = tsv('witnesses.tsv');
const xref = tsv('xref.tsv');
const xrefSent = tsv('xref-sentence.tsv');
const glossRows = tsv('glossary.tsv');
const clauseRows = tsv('clauses.tsv');

// sections：sections.tsv 的閱讀順序 → n=1..N
const secKey = (juan: string, pian: string) => `${juan}\u0000${pian}`;
const secMap = new Map<string, number>();
const sections = secRows.map((r, i) => {
  const n = i + 1;
  secMap.set(secKey(r[0]!, r[1]!), n);
  return { n, title: r[1]! };
});

// 主文：每軌一句；u 為 0 起序號
const sents: { t: string; u: number; s: number; p: string }[] = [];
const unitOfTrack = new Map<string, number>();
const clauseUnits = new Map<string, number[]>();
tracks.forEach((r, u) => {
  const [id, base, , , , , , juan, pian] = r;
  const s = secMap.get(secKey(juan!, pian!)) ?? 1;
  sents.push({ t: r[11]!, u, s, p: '' });
  unitOfTrack.set(id!, u);
  if (base!.startsWith('S')) {
    if (!clauseUnits.has(base!)) clauseUnits.set(base!, []);
    clauseUnits.get(base!)!.push(u);
  }
});

const meta = {
  title: '傷寒論選注',
  sub: '宋本 398 條 · 8 家注 · 條級 prototype（自動對位，待校）',
  hideBadge: true,
  workNames: Object.fromEntries(WORKS.map((id) => {
    const row = wit.find((w) => w[0] === id);
    return [id, row ? row[1]!.replace(/^傷寒論|^註解|^古本/, '').trim() : id];
  })),
};

const works: any[] = [];
for (const id of WORKS) {
  const text = FILES[id]!;
  const file = join(DATA, 'sources', `${text}.html`);
  const book = parseBook(file);
  let full = '';
  const sentOff = new Map<string, { a: number; b: number }>();
  for (const p of book.paras) {
    const key = p.id || `p${p.idx}`;
    splitSentences(p.text).forEach((s, ord) => {
      const a = full.length;
      full += s + '\n';
      sentOff.set(`${key}:${ord}`, { a, b: a + s.length });
      sentOff.set(`p${p.idx}:${ord}`, { a, b: a + s.length });
    });
  }

  const anchors: [number, number, number, string][] = [];
  const seen = new Set<string>();
  const hitUnits = new Set<number>();
  if (CLAUSE) {
    // 條級：整條注文掛到該條所有 sentence tracks
    for (const r of xref) {
      if (r[0] !== id || r[6] === 'gap' || !r[1]) continue;
      const a = sentOff.get(`${r[1]}:0`)?.a;
      const keys = [...sentOff.keys()].filter((k) => k.startsWith(`${r[2]}:`))
        .sort((x, y) => +x.split(':')[1]! - +y.split(':')[1]!);
      const b = keys.length ? sentOff.get(keys.at(-1)!)?.b : undefined;
      const u0 = unitOfTrack.get(r[4]!);
      const u1 = unitOfTrack.get(r[5]!);
      if (a === undefined || b === undefined || u0 === undefined || u1 === undefined) continue;
      for (let u = u0; u <= u1; u++) {
        if (seen.has(`${u}`)) continue;
        seen.add(`${u}`);
        anchors.push([u, a, b, '']);
      }
    }
  } else {
    // 句級：quote／whole 都指向某個 sentence track
    for (const r of xrefSent) {
      if (r[0] !== id || !r[1]) continue;
      const o = sentOff.get(`${r[1]}:${r[3]}`) ?? sentOff.get(`${r[2]}:${r[3]}`);
      const u = unitOfTrack.get(r[4]!);
      if (!o || u === undefined) continue;
      if (seen.has(`${u}`)) continue;
      seen.add(`${u}`);
      anchors.push([u, o.a, o.b, '']);
      hitUnits.add(u);
    }
    // 條級 fallback：沒有句級 anchor 的句，掛整條注文
    for (const r of xref) {
      if (r[0] !== id || r[6] === 'gap' || !r[1]) continue;
      const a = sentOff.get(`${r[1]}:0`)?.a ?? 0;
      const keys = [...sentOff.keys()].filter((k) => k.startsWith(`${r[2]}:`));
      const b = keys.length ? sentOff.get(keys[0]!)?.b ?? a : a;
      const u0 = unitOfTrack.get(r[4]!);
      const u1 = unitOfTrack.get(r[5]!);
      if (u0 === undefined || u1 === undefined) continue;
      for (let u = u0; u <= u1; u++) {
        if (hitUnits.has(u)) continue;
        if (seen.has(`${u}`)) continue;
        seen.add(`${u}`);
        anchors.push([u, a, b, '']);
      }
    }
  }

  const row = wit.find((w) => w[0] === id)!;
  works.push({
    id, title: row[1], author: row[2], date: row[3], year: parseInt(row[4]!) || 0,
    corpus: '中醫笈成', no: id, vol: '', kind: '注疏', base: 'SB',
    text: full, anchors,
  });
  console.log(`${id}\t${row[1]}\t${full.length} 字\t${anchors.length} anchors`);
}

// 辭典：術語 + 每條一個「第N條」條目；clauses 讓閱讀器用條號選取
const juanNo = (s: string) => {
  const m = /^卷第([一二三四五六七八九十]+)$/.exec(s);
  if (!m) return 0;
  const map: Record<string, number> = { 一:1, 二:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9, 十:10 };
  return map[m[1]!] ?? 0;
};
const clauseInfo = clauseRows.map((r) => {
  const n = +r[0]!;
  const u = unitOfTrack.get(r[3]!);
  const s = u === undefined ? 1 : sents[u]!.s;
  return { n, s, u: u ?? 0, juan: juanNo(r[1]!), text: r[7]! };
});
const makeOcc = (c: (typeof clauseInfo)[number]) => ({ s: c.s, u: c.u, juan: c.juan, page: '', quote: c.text.slice(0, 100) });

const termEntries = glossRows.map((r, i) => {
  const term = r[0]!;
  const hit = clauseInfo.filter((c) => c.text.includes(term));
  return {
    id: 'g' + (i + 1), term, aliases: [], category: r[1]!, gloss: r[2]!,
    refLabel: '首見', ref: r[3]!, count: hit.length, clauses: hit.map((c) => c.n),
    occurrences: hit.slice(0, 5).map(makeOcc),
  };
});
const clauseEntries = clauseInfo.map((c) => ({
  id: 'c' + c.n, term: `第${c.n}條`, aliases: [String(c.n), `S${String(c.n).padStart(4, '0')}`],
  category: '條文', gloss: c.text, refLabel: '宋本', ref: String(c.n), count: 1, clauses: [c.n],
  occurrences: [makeOcc(c)],
}));
const catCount = new Map<string, number>();
for (const e of [...termEntries, ...clauseEntries]) catCount.set(e.category, (catCount.get(e.category) ?? 0) + 1);
const glossary = {
  schema: 1,
  clauses: clauseInfo.map((c) => ({ n: c.n, label: c.text.slice(0, 14) })),
  categories: [...catCount].map(([id, count]) => ({ id, label: id, count })),
  entries: [...clauseEntries, ...termEntries],
};

const doc = {
  generated: new Date().toISOString(),
  meta,
  sections,
  versions: [{
    id: 'SB', label: '宋本', trans: '漢 張仲景撰；晉 王叔和編次；宋 林億校正',
    group: 'base', lang: 'zh', sents,
  }],
  works,
  ...(NO_GLOSS ? {} : { glossary }),
};
writeFileSync(join(OUT, 'zhu-data.js'), 'window.ZHU=' + JSON.stringify(doc) + ';\n');
console.log(`→ out/proto/zhu-data.js（${sents.length} 句、${works.length} 家、${sections.length} 節）`);


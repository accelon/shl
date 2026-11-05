#!/usr/bin/env bun
/**
 * 跨區 pilot：傷寒論「經曰／經云」引文 → hdnj 的內經軌號。
 *
 *   bun run src/build-xref-hdnj.ts
 *
 * 只讀 hdnj 的 tracks（不寫對方）；高覆蓋率才收，低於門檻不寫。
 * 產出 data/xref-hdnj.tsv（kind=quote）。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normHan } from './lib/book';
import { tsv } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');
const HDNJ = join(ROOT, '..', 'hdnj', 'data', 'tracks');

const grams = (s: string, n = 4) => { const o: string[] = []; for (let i = 0; i + n <= s.length; i++) o.push(s.slice(i, i + n)); return o; };

const files = ['zh-suwen.tsv', 'zh-lingshu.tsv'].map((f) => join(HDNJ, f)).filter(existsSync);
if (!files.length) {
  console.log('hdnj tracks 不存在，跳過');
  process.exit(0);
}

type H = { id: string; text: string; title: string };
const hs: H[] = [];
for (const f of files) {
  const lines = readFileSync(f, 'utf8').trim().split('\n');
  const head = lines[0]!.split('\t');
  const ix = Object.fromEntries(head.map((h, i) => [h, i]));
  for (const l of lines.slice(1)) {
    const c = l.split('\t');
    hs.push({ id: c[ix.track_id!]!, text: c[ix.text!]!, title: c[ix.pian_title!] ?? '' });
  }
}

const index = new Map<string, number[]>();
hs.forEach((h, i) => {
  for (const g of grams(h.text, 4)) {
    if (!index.has(g)) index.set(g, []);
    index.get(g)!.push(i);
  }
});

const { parseBook } = await import('./lib/book');
const book = parseBook(join(DATA, 'sources', 'zhujie.html'));
const tracks = book.paras.map((p) => ({ id: `ZJ:p${p.idx}`, text: p.text }));
const rows: string[][] = [['shl_source', 'hdnj_track', 'coverage', 'shl_text', 'hdnj_text', 'hdnj_pian']];

for (const r of tracks) {
  const text = r.text;
  if (!/(《內經》曰|《素問》曰|《針經》曰|經曰|經云)/.test(text)) continue;
  // 取「經曰」之後的引文；沒有引號時取整句
  const after = text.replace(/^.*?(《內經》曰|《素問》曰|《針經》曰|經曰|經云)[：:]?/, '');
  const key = normHan(after.length >= 8 ? after : text);
  if (key.length < 8) continue;
  const gs = [...new Set(grams(key, 4))];
  const score = new Float32Array(hs.length);
  for (const g of gs) for (const i of index.get(g) ?? []) score[i]!++;
  let best = 0, bi = -1;
  for (let i = 0; i < hs.length; i++) {
    const sc = score[i]! / gs.length;
    if (sc > best) { best = sc; bi = i; }
  }
  if (best < 0.65 || bi < 0) continue;
  rows.push([
    r.id, hs[bi]!.id, best.toFixed(2), after.slice(0, 60),
    hs[bi]!.text.slice(0, 60), hs[bi]!.title,
  ]);
}

writeFileSync(join(DATA, 'xref-hdnj.tsv'), tsv(rows));
console.log(`quote xref ${rows.length - 1} → data/xref-hdnj.tsv`);
for (const r of rows.slice(1, 11)) console.log(r.slice(0, 3).join('\t'), '|', r[3]!.slice(0, 24), '→', r[5]);



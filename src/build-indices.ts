#!/usr/bin/env bun
/**
 * 由軌號產生三個索引：方劑、篇、藥味。
 *
 *   bun run src/build-indices.ts
 *
 * 產出 data/formulas.tsv、data/sections.tsv、data/herbs.tsv
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tsv } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');
const rows = readFileSync(join(DATA, 'tracks-zh.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));

type T = {
  id: string; base: string; part: number; kind: string; juan: string; pian: string;
  clause: string; formula: string; text: string;
};
const tracks: T[] = rows.map((r) => ({
  id: r[0]!, base: r[1]!, part: +r[2]!, kind: r[4]!, juan: r[7]!, pian: r[8]!,
  clause: r[9]!, formula: r[10]!, text: r[11]!,
}));

// 篇索引
const sec = new Map<string, T[]>();
for (const t of tracks) {
  const k = `${t.juan}\u0000${t.pian}`;
  if (!sec.has(k)) sec.set(k, []);
  sec.get(k)!.push(t);
}
const sectionRows: (string | number)[][] = [[
  'juan', 'pian', 'track_start', 'track_end', 'clause_first', 'clause_last',
  'clauses', 'formulas', 'chars',
]];
for (const [k, list] of sec) {
  const [juan, pian] = k.split('\u0000') as [string, string];
  const cs = list.filter((t) => t.kind === 'clause').map((t) => +t.clause).filter((n) => n > 0);
  const fs = new Set(list.filter((t) => t.formula).map((t) => `${t.base}\u0000${t.formula}`));
  sectionRows.push([
    juan, pian, list[0]!.id, list.at(-1)!.id,
    cs.length ? Math.min(...cs) : '', cs.length ? Math.max(...cs) : '',
    cs.length, fs.size, list.reduce((n, t) => n + t.text.length, 0),
  ]);
}
writeFileSync(join(DATA, 'sections.tsv'), tsv(sectionRows));

// 條索引
const cmap = new Map<string, T[]>();
for (const t of tracks) {
  if (!t.base.startsWith('S')) continue;
  if (!cmap.has(t.base)) cmap.set(t.base, []);
  cmap.get(t.base)!.push(t);
}
const clauseRows: (string | number)[][] = [[
  'clause_no', 'juan', 'pian', 'track_start', 'track_end', 'sentences', 'formulas', 'text',
]];
for (const [base, list] of [...cmap].sort((a, b) => +a[0].slice(1) - +b[0].slice(1))) {
  const cs = list.filter((t) => t.kind === 'clause');
  const fs = [...new Set(list.map((t) => t.formula).filter(Boolean))];
  clauseRows.push([
    String(+base.slice(1)), list[0]!.juan, list[0]!.pian,
    cs[0]?.id ?? '', cs.at(-1)?.id ?? '', cs.length, fs.join('、'),
    cs.map((t) => t.text).join(''),
  ]);
}
writeFileSync(join(DATA, 'clauses.tsv'), tsv(clauseRows));

// 方劑索引
const fmap = new Map<string, T[]>();
for (const t of tracks) {
  if (!t.formula) continue;
  const k = `${t.base}\u0000${t.formula}`;
  if (!fmap.has(k)) fmap.set(k, []);
  fmap.get(k)!.push(t);
}
const formulaRows: (string | number)[][] = [[
  'formula', 'base_sid', 'clause_no', 'title_track', 'ingredient_track',
  'method_tracks', 'herbs', 'herb_count', 'method_chars',
]];
for (const [, list] of fmap) {
  const title = list.find((t) => t.kind === 'formula-title');
  const ing = list.find((t) => t.kind === 'formula-ingredients');
  const methods = list.filter((t) => t.kind === 'formula-method');
  const herbs = (ing?.text ?? '').split('\u3000').map((s) => s.replace(/（[^）]*）/g, '').trim()).filter(Boolean);
  formulaRows.push([
    list[0]!.formula, list[0]!.base, list[0]!.clause || list[0]!.base,
    title?.id ?? '', ing?.id ?? '', methods.map((t) => t.id).join(','),
    herbs.join('、'), herbs.length, methods.reduce((n, t) => n + t.text.length, 0),
  ]);
}
writeFileSync(join(DATA, 'formulas.tsv'), tsv(formulaRows));

// 藥味索引
const herb = new Map<string, { count: number; formulas: Set<string> }>();
for (const t of tracks) {
  if (t.kind !== 'formula-ingredients') continue;
  for (const seg of t.text.split('\u3000')) {
    const name = seg.replace(/（[^）]*）/g, '').trim();
    if (!name || name.length > 6) continue;
    if (!herb.has(name)) herb.set(name, { count: 0, formulas: new Set() });
    const h = herb.get(name)!;
    h.count++;
    h.formulas.add(t.formula);
  }
}
const herbRows: (string | number)[][] = [['herb', 'count', 'formula_count', 'examples']];
for (const [name, h] of [...herb].sort((a, b) => b[1].count - a[1].count)) {
  herbRows.push([name, h.count, h.formulas.size, [...h.formulas].slice(0, 5).join('、')]);
}
writeFileSync(join(DATA, 'herbs.tsv'), tsv(herbRows));

console.log(`sections ${sectionRows.length - 1}; formulas ${formulaRows.length - 1}; herbs ${herbRows.length - 1}`);
console.log(herbRows.slice(1, 9).map((r) => r.slice(0, 3).join('\t')).join('\n'));



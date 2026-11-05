#!/usr/bin/env bun
/**
 * 用 xref 回填 cuts.tsv 的「條界支持家數」。
 *
 *   bun run src/annotate-cuts.ts
 *
 * 判準：某注本若把第 n-1 條與第 n 條放在不同的 source unit，就算支持這刀；
 * 若同一段落（合併），則不支持。缺一側（gap）不算支持。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tsv } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');

const xrows = readFileSync(join(DATA, 'xref.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
// work -> clause no -> source unit key
const map = new Map<string, Map<number, string>>();
for (const r of xrows) {
  const [work, sStart, sEnd, , tStart, tEnd, relation] = r;
  if (relation === 'gap') continue;
  const c0 = +tStart!.slice(1, 5);
  const c1 = +tEnd!.slice(1, 5);
  if (!map.has(work!)) map.set(work!, new Map());
  const m = map.get(work!)!;
  // 範圍行只記起點；同一 source unit 內的多條，key 相同
  for (let c = c0; c <= c1; c++) if (!m.has(c)) m.set(c, `${sStart}-${sEnd}`);
}
const works = [...map.keys()];
const trows = readFileSync(join(DATA, 'tracks-zh.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const tText = new Map(trows.map((r) => [r[0]!, r[11]!]));

const head = readFileSync(join(DATA, 'cuts.tsv'), 'utf8').trim().split('\n')[0]!.split('\t');
const ci = Object.fromEntries(head.map((h, i) => [h, i]));
const rows = readFileSync(join(DATA, 'cuts.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));

let touched = 0;
for (const r of rows) {
  if (r[ci.kind!] !== 'tiao') continue;
  const after = r[ci.after_track!]!;
  const n = +after.slice(1, 5);
  if (n <= 1) continue;
  const support: string[] = ['SB'];
  for (const w of works) {
    const m = map.get(w)!;
    const a = m.get(n - 1);
    const b = m.get(n);
    if (a && b && a !== b) support.push(w);
  }
  r[ci.support!] = String(support.length);
  r[ci.evidence!] = support.join(';');
  touched++;
}
writeFileSync(join(DATA, 'cuts.tsv'), tsv([head, ...rows]));

// 給人工校對的刀：低支持、後句以連詞起、前句以逗號收
const review: string[][] = [['cut_id', 'after_clause', 'support', 'flag', 'before_text', 'after_text', 'evidence']];
for (const r of rows) {
  if (r[ci.kind!] !== 'tiao') continue;
  const flags: string[] = [];
  const support = +r[ci.support!]!;
  const before = (tText.get(r[ci.before_track!]!) ?? '').slice(-24);
  const after = (tText.get(r[ci.after_track!]!) ?? '').slice(0, 32);
  if (support <= 10) flags.push('low-support');
  if (/^[若而故此其以則然但且乃復又]/.test(after)) flags.push('after-connective');
  if (/[，；：]$/.test(before)) flags.push('before-comma');
  if (!flags.length) continue;
  review.push([r[ci.cut_id!]!, r[ci.after_track!]!.slice(1, 5), String(support), flags.join('|'), before, after, r[ci.evidence!]!]);
}
writeFileSync(join(DATA, 'cut-review.tsv'), tsv(review));

const dist: Record<string, number> = {};
for (const r of rows) if (r[ci.kind!] === 'tiao') dist[r[ci.support!]!] = (dist[r[ci.support!]!] ?? 0) + 1;
console.log(`tiao cuts annotated: ${touched}; review rows ${review.length - 1}`);
console.log('support distribution', dist);

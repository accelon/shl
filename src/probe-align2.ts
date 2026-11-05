#!/usr/bin/env bun
/** 探測 2：全域倒排索引，看宋本 398 條在每部書的最佳段落與覆蓋率。 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBook, normHan } from './lib/book';
import { hanOnly } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const rows = readFileSync(join(ROOT, 'data', 'tracks-zh.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const clauses = rows.filter((r) => r[4] === 'clause' && r[2] === '1').map((r) => ({ no: +r[9], text: r[11]! }));

const works: [string, string][] = [
  ['ZJ', '註解傷寒論'], ['KP', '古本康平傷寒論'], ['GL', '傷寒雜病論（桂林古本）'], ['YH', '金匱玉函經'],
  ['TB', '傷寒論條辨'], ['SL', '尚論篇'], ['LS', '傷寒論註來蘇集'], ['GZ', '傷寒貫珠集'],
  ['QZ', '傷寒論淺註補正'], ['JY', '傷寒論輯義'], ['SY', '傷寒論述義'], ['JC', '傷寒論集成'],
  ['ML', '傷寒明理論'], ['ZB', '傷寒總病論'], ['HR', '類證活人書'], ['LF', '傷寒論類方'],
  ['SYJ', '傷寒溯源集'], ['XJ', '傷寒懸解'], ['GM', '傷寒論綱目'], ['ZZ', '張卿子傷寒論'],
  ['HZ', '傷寒論彙註精華'], ['BZ', '傷寒百證歌'],
];
const files: Record<string, string> = { ZJ: 'zhujie', KP: 'kangping', GL: 'guilin', YH: 'yuhan' };

function grams(s: string, n = 4): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= s.length; i++) out.push(s.slice(i, i + n));
  return out;
}

for (const [id, title] of works) {
  const file = join(ROOT, 'data', 'sources', `${files[id] ?? title}.html`);
  let book;
  try { book = parseBook(file); } catch { console.log(id, 'MISSING'); continue; }
  const P = book.paras.map((p) => normHan(p.text));
  const index = new Map<string, number[]>();
  P.forEach((txt, i) => {
    for (const g of new Set(grams(txt))) {
      if (!index.has(g)) index.set(g, []);
      index.get(g)!.push(i);
    }
  });
  const scores: number[] = [];
  const bests: { no: number; bi: number; sc: number }[] = [];
  for (const c of clauses) {
    const key = normHan(c.text);
    const gs = [...new Set(grams(key))];
    const score = new Float32Array(P.length);
    for (const g of gs) for (const i of index.get(g) ?? []) score[i]!++;
    let best = 0, bi = -1;
    for (let i = 0; i < P.length; i++) {
      const sc = score[i]! / gs.length;
      if (sc > best) { best = sc; bi = i; }
    }
    scores.push(best);
    bests.push({ no: c.no, bi, sc: best });
  }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const n50 = scores.filter((x) => x >= 0.5).length;
  const n60 = scores.filter((x) => x >= 0.6).length;
  const n70 = scores.filter((x) => x >= 0.7).length;
  console.log(`${id}\t${title}\tparas=${P.length}\tavg=${avg.toFixed(2)}\t>=.5:${n50}\t>=.6:${n60}\t>=.7:${n70}`);
  if (['ZJ', 'GL', 'SL', 'TB', 'YH'].includes(id)) {
    for (const b of bests.filter((x) => [1, 12, 100, 300, 398].includes(x.no))) {
      console.log(`  T${b.no} -> p${b.bi} ${b.sc.toFixed(2)} ${P[b.bi]?.slice(0, 50) ?? ''}`);
    }
  }
}

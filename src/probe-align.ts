#!/usr/bin/env bun
/** 探測：宋本 398 條在各注本／別本中的可定位率（不寫檔）。 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBook, normHan } from './lib/book';
import { gramCoverage } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const rows = readFileSync(join(ROOT, 'data', 'tracks-zh.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const clauses = rows.filter((r) => r[4] === 'clause' && r[2] === '1').map((r) => ({ no: +r[9], text: r[11]! }));
console.log('clauses', clauses.length);

const works: [string, string][] = [
  ['ZJ', '註解傷寒論'], ['KP', '古本康平傷寒論'], ['GL', '傷寒雜病論（桂林古本）'], ['YH', '金匱玉函經'],
  ['TB', '傷寒論條辨'], ['SL', '尚論篇'], ['LS', '傷寒論註來蘇集'], ['GZ', '傷寒貫珠集'],
  ['QZ', '傷寒論淺註補正'], ['JY', '傷寒論輯義'], ['SY', '傷寒論述義'], ['JC', '傷寒論集成'],
  ['ML', '傷寒明理論'], ['ZB', '傷寒總病論'], ['HR', '類證活人書'], ['LF', '傷寒論類方'],
  ['SYJ', '傷寒溯源集'], ['XJ', '傷寒懸解'], ['GM', '傷寒論綱目'], ['ZZ', '張卿子傷寒論'],
  ['HZ', '傷寒論彙註精華'], ['BZ', '傷寒百證歌'],
];
const files: Record<string, string> = {
  ZJ: 'zhujie', KP: 'kangping', GL: 'guilin', YH: 'yuhan', MJ: 'maijing', QJ: 'qianjin',
};

for (const [id, title] of works) {
  const file = join(ROOT, 'data', 'sources', `${files[id] ?? title}.html`);
  let book;
  try { book = parseBook(file); } catch (e) { console.log(id, 'MISSING'); continue; }
  const P = book.paras.map((p) => normHan(p.text));
  let last = 0;
  let found = 0, c50 = 0, c60 = 0, c70 = 0, gaps = 0;
  const scores: number[] = [];
  for (const c of clauses) {
    const key = normHan(c.text);
    let best = 0, bi = -1;
    const end = Math.min(P.length, last + 260);
    for (let i = last; i < end; i++) {
      const sc = gramCoverage(key, P[i]!);
      if (sc > best) { best = sc; bi = i; }
      // 兩段合併（引文被分段）
      if (i + 1 < end) {
        const sc2 = gramCoverage(key, P[i]! + P[i + 1]!);
        if (sc2 > best) { best = sc2; bi = i; }
      }
    }
    scores.push(best);
    if (best >= 0.5) { found++; if (bi >= last) last = bi; }
    if (best >= 0.5) c50++;
    if (best >= 0.6) c60++;
    if (best >= 0.7) c70++;
    if (best < 0.4) gaps++;
  }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  console.log(`${id}\t${title}\tparas=${P.length}\tavg=${avg.toFixed(2)}\t>=.5:${c50}\t>=.6:${c60}\t>=.7:${c70}\tgaps<.4:${gaps}`);
}

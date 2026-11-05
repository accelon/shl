#!/usr/bin/env bun
/**
 * 抽樣 xref 供人工校對（每本 2 列，優先 B/C）。
 *
 *   bun run src/sample-xref.ts
 *
 * 產出 data/xref-review.tsv；不含原文全文，只放前 60 字，方便對照。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBook } from './lib/book';
import { parseJcXml } from './lib/jcbook';
import { tsv } from './lib/text';

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

const tracks = readFileSync(join(DATA, 'tracks-zh.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const clauseText = new Map<string, string>();
for (const r of tracks) if (r[4] === 'clause') {
  const k = r[1]!;
  clauseText.set(k, (clauseText.get(k) ?? '') + r[11]);
}

const rows = readFileSync(join(DATA, 'xref.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const byWork = new Map<string, string[][]>();
for (const r of rows) {
  if (!byWork.has(r[0]!)) byWork.set(r[0]!, []);
  byWork.get(r[0]!).push(r);
}

const out: (string | number)[][] = [['work_id', 'track_start', 'track_end', 'confidence', 'coverage', 'clause_text', 'source_text', 'source_label', 'verdict']];

for (const [work, list] of byWork) {
  const cand = list.filter((r) => r[6] !== 'gap');
  const focus = cand.filter((r) => +r[8]! >= 0.5 && +r[8]! < 0.85);
  const pool = (focus.length >= 2 ? focus : cand).slice();
  const picks = pool.length <= 2 ? pool : [pool[0]!, pool[Math.floor(pool.length / 2)]!];
  if (!picks.length) continue;
  const book = work === 'BW' || work === 'CYF'
    ? { paras: parseJcXml(join(ROOT, 'out', 'jc-books', `${FILES[work]}.xml`)) }
    : parseBook(join(DATA, 'sources', `${FILES[work]}.html`));
  for (const r of picks) {
    const start = r[1]!;
    const para = book.paras.find((p) => p.id === start || `p${p.idx}` === start);
    const c0 = +r[4]!.slice(1, 5);
    out.push([
      work, r[4]!, r[5]!, r[7]!, r[8]!,
      (clauseText.get(`S${String(c0).padStart(4, '0')}`) ?? '').slice(0, 60),
      (para?.text ?? '').slice(0, 60),
      r[3]!, '',
    ]);
  }
}

writeFileSync(join(DATA, 'xref-review.tsv'), tsv(out));
console.log(`review rows ${out.length - 1} → data/xref-review.tsv`);

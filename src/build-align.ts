#!/usr/bin/env bun
/**
 * 由 xref 產生別本的 align.tsv（階段一：漢文別本）。
 *
 *   bun run src/build-align.ts
 *
 * 只做 KP／GL／YH 三本；其他語種（階段二）另建 tracks-en.tsv 等，不動漢文。
 * track_b 用「work.來源段落 id」作 realization id；文本仍留在 data/sources（唯讀）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tsv } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');
const WORKS = new Set(['KP', 'GL', 'YH']);

const rows = readFileSync(join(DATA, 'xref.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const out: string[][] = [['track_a', 'track_b', 'relation', 'confidence', 'note']];

for (const r of rows) {
  const [work, sStart, sEnd, sLabel, tStart, tEnd, relation, conf] = r;
  if (!WORKS.has(work!)) continue;
  if (relation === 'gap') {
    out.push([tStart!, '', 'gap', conf!, `${sLabel}（缺）`]);
    continue;
  }
  out.push([
    tStart!,
    `${work}.${sStart}`,
    relation!,
    conf!,
    `${sLabel}${sEnd && sEnd !== sStart ? `–${sEnd}` : ''} → ${tEnd}`,
  ]);
}

writeFileSync(join(DATA, 'align.tsv'), tsv(out));
const byWork: Record<string, number> = {};
for (const r of out.slice(1)) {
  const w = r[1]!.split('.')[0] || 'gap';
  byWork[w!] = (byWork[w!] ?? 0) + 1;
}
console.log(`align rows ${out.length - 1}`, byWork);

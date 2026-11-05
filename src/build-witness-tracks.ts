#!/usr/bin/env bun
/**
 * 別本／早期傳本的 realization 軌：xref 的 source 端 → 自己的 track_id。
 *
 *   bun run src/build-witness-tracks.ts
 *
 * 產出 data/tracks-witness.tsv。track_id = `<work>.<source_start>`，
 * 與 data/align.tsv 的 track_b 一致，讓 align 的兩端都可解析。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBook } from './lib/book';
import { tsv } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');
const FILES: Record<string, string> = {
  KP: 'kangping', GL: 'guilin', YH: 'yuhan',
  MJ: 'maijing', QY: 'qianjin', WT: '外臺秘要', SHF: '太平聖惠方',
};

const xrows = readFileSync(join(DATA, 'xref.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const rows: (string | number)[][] = [['track_id', 'witness_id', 'base_sid', 'part', 'lang', 'source', 'section', 'text', 'xref_track_start', 'xref_track_end', 'confidence']];
const seen = new Set<string>();

for (const work of Object.keys(FILES)) {
  const book = parseBook(join(DATA, 'sources', `${FILES[work]}.html`));
  const byId = new Map<string, (typeof book.paras)[number]>();
  for (const p of book.paras) {
    byId.set(p.id || `p${p.idx}`, p);
    byId.set(`p${p.idx}`, p);
  }
  for (const r of xrows) {
    if (r[0] !== work || r[6] === 'gap' || !r[1]) continue;
    const id = `${work}.${r[1]}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const p = byId.get(r[1]!);
    if (!p) continue;
    rows.push([
      id, work, r[1]!, 1, 'zh', work, p.path.join(' / '),
      p.text, r[4]!, r[5]!, r[7]!,
    ]);
  }
}

writeFileSync(join(DATA, 'tracks-witness.tsv'), tsv(rows));
const counts: Record<string, number> = {};
for (const r of rows.slice(1)) counts[r[1] as string] = (counts[r[1] as string] ?? 0) + 1;
console.log(`witness tracks ${rows.length - 1}`, counts);


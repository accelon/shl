#!/usr/bin/env bun
/**
 * 掃 jc.adb 的 XML 匯出（out/jc-xml/jc.xml）：列出全部書名與位置，並抽出傷寒相關書。
 *
 *   bun run src/scan-jc.ts [jc.xml] [--extract]
 *
 * 產出：
 *   data/jc-catalog.tsv        全部 1,360 本書名、offset、bytes
 *   out/jc-books/*.xml         符合 filter 的單書 XML
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tsv } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const XML = process.argv[2] && !process.argv[2]!.startsWith('--')
  ? process.argv[2]!
  : join(ROOT, 'out', 'jc-xml', 'jc.xml');
const EXTRACT = process.argv.includes('--extract');

const buf = readFileSync(XML);
const START = Buffer.from('<書名>');
const END = Buffer.from('</書名>');

type Entry = { title: string; start: number; end: number };
const entries: Entry[] = [];
let pos = 0;
while (true) {
  const i = buf.indexOf(START, pos);
  if (i < 0) break;
  const j = buf.indexOf(END, i);
  if (j < 0) break;
  const title = buf.toString('utf8', i + START.length, j).trim();
  entries.push({ title, start: i, end: buf.length });
  pos = j + END.length;
}
for (let k = 0; k < entries.length - 1; k++) entries[k]!.end = entries[k + 1]!.start;

const rows: (string | number)[][] = [['idx', 'title', 'start', 'end', 'bytes']];
entries.forEach((e, i) => rows.push([i + 1, e.title, e.start, e.end, e.end - e.start]));
writeFileSync(join(ROOT, 'data', 'jc-catalog.tsv'), tsv(rows));
console.log(`catalog ${entries.length} books → data/jc-catalog.tsv`);

const RE = /傷寒|金匱|脈經|千金翼|外臺|聖惠|康治|康平|桂林|註解傷寒|條辨|尚論|來蘇|貫珠|淺註|淺注|輯義|集成|懸解|綱目|類方|溯源|明理論|總病論|活人書|傷寒論/;

// 與 witnesses 比對（只做粗略正規化：去括號、註/注、彙/匯）
const norm = (x: string) => x.replace(/[（(].*?[）)]/g, '').replace(/[·・]/g, '').replace(/註/g, '注').replace(/彙/g, '匯').trim();
const wrows = readFileSync(join(ROOT, 'data', 'witnesses.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const have = new Set(wrows.map((r) => norm(r[1]!)));

const srows: (string | number)[][] = [['title', 'xml_file', 'start', 'end', 'bytes', 'in_witnesses']];
let extracted = 0;
for (const e of entries) {
  if (!RE.test(e.title)) continue;
  const xml = e.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) + '.xml';
  srows.push([e.title, xml, e.start, e.end, e.end - e.start, have.has(norm(e.title)) ? 1 : 0]);
  extracted++;
}
writeFileSync(join(ROOT, 'data', 'jc-sources.tsv'), tsv(srows));
console.log(`jc-sources ${extracted} books（${srows.slice(1).filter((r) => r[5] === 0).length} 本不在 witnesses）→ data/jc-sources.tsv`);

if (EXTRACT) {
  const dir = join(ROOT, 'out', 'jc-books');
  mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const e of entries) {
    if (!RE.test(e.title)) continue;
    const name = e.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) + '.xml';
    writeFileSync(join(dir, name), buf.subarray(e.start, e.end));
    n++;
  }
  console.log(`extracted ${n} books → out/jc-books/`);
}

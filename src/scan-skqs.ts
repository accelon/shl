#!/usr/bin/env bun
/**
 * 掃四庫全書子部（skqs sbqs-03.zi.adb 的 XML 匯出）：列出醫家類書，抽出傷寒微旨論。
 *
 *   bun run src/scan-skqs.ts [sbqs-03.zi.xml]
 *
 * 產出 data/skqs-med.tsv、data/sources/skqs-wz.txt。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tsv } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const XML = process.argv[2] ?? join(ROOT, 'out', 'skqs', 'sbqs-03.zi.xml');
const text = readFileSync(XML, 'utf8');

const re = /<卷>([^<]*)<\/卷>/g;
const marks: { at: number; title: string; parts: string[] }[] = [];
let m: RegExpExecArray | null;
while ((m = re.exec(text))) {
  const title = m[1]!;
  const parts = title.split(',');
  if (parts[0] !== '子部' || parts[1] !== '醫家類') continue;
  marks.push({ at: m.index, title, parts });
}

const count = new Map<string, number>();
for (const x of marks) count.set(x.parts[2] ?? x.title, (count.get(x.parts[2] ?? x.title) ?? 0) + 1);

const rows: (string | number)[][] = [['book', 'volumes']];
for (const [b, n] of [...count].sort((a, b) => b[1] - a[1])) rows.push([b, n]);
writeFileSync(join(ROOT, 'data', 'skqs-med.tsv'), tsv(rows));
console.log(`醫家類 ${count.size} 部、${marks.length} 卷 → data/skqs-med.tsv`);

// 抽 傷寒微旨論（5 卷）
const want = marks.filter((x) => x.parts[2] === '傷寒微旨論');
let out = '';
for (let i = 0; i < want.length; i++) {
  const start = want[i]!.at;
  const end = marks.find((x) => x.at > start)?.at ?? text.length;
  const raw = text.slice(start, end);
  const body = raw
    .replace(/<[^>]+>/g, '\n')
    .replace(/&[a-zA-Z]+;/g, ' ')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !/^欽定四庫全書$/.test(s))
    .join('\n');
  out += body + '\n';
}
writeFileSync(join(ROOT, 'data', 'sources', 'skqs-wz.txt'), out);
console.log(`傷寒微旨論 ${want.length} 卷、${out.length} 字 → data/sources/skqs-wz.txt`);

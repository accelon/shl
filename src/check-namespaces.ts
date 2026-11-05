#!/usr/bin/env bun
/**
 * 跨工作區 namespace 檢查：shl/data/witnesses.tsv ↔ hdnj/data/works.tsv。
 *
 *   bun run src/check-namespaces.ts
 *
 * 同 ID 同書（MJ 脈經、WT 外臺、QY 千金翼方）允許；
 * 同 ID 不同書 → 錯誤，必須改號。透過相對路徑讀 hdnj，不寫入對方。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const HDNJ = join(ROOT, '..', 'hdnj', 'data', 'works.tsv');
const SHL = join(ROOT, 'data', 'witnesses.tsv');

const read = (f: string) => {
  const lines = readFileSync(f, 'utf8').trim().split('\n');
  const head = lines[0]!.split('\t');
  return lines.slice(1).map((l) => Object.fromEntries(l.split('\t').map((v, i) => [head[i]!, v])));
};

if (!existsSync(HDNJ)) {
  console.log('hdnj works.tsv 不存在，跳過');
  process.exit(0);
}

const h = new Map(read(HDNJ).map((r) => [r.work_id!, r]));
const s = new Map(read(SHL).map((r) => [r.witness_id!, r]));
const SAME_BOOK = new Set(['MJ', 'WT', 'QY', 'SW', 'LS', 'NJ']);

const issues: string[] = [];
const same: string[] = [];
for (const [id, a] of s) {
  const b = h.get(id);
  if (!b) continue;
  if (SAME_BOOK.has(id)) {
    same.push(`${id}\t${a.title} ／ ${b.title}`);
    continue;
  }
  issues.push(`${id}\tshl: ${a.title}\thdnj: ${b.title}`);
}

if (same.length) {
  console.log('同名同書（允許）：');
  for (const l of same) console.log('  ' + l);
}
if (issues.length) {
  console.error('ID 碰撞（不同書）：');
  for (const l of issues) console.error('  ' + l);
  process.exit(1);
}
console.log('namespace OK');

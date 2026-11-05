#!/usr/bin/env bun
/**
 * 別本異文表 pilot：宋本條文 vs KP／GL／YH 的 1:1 realization。
 *
 *   bun run src/build-variants.ts
 *
 * 只比 A/B 級、1:1 的列；用 hanOnly（已統一常見異體）做字級 LCS，
 * 輸出有實質差異的片段與上下文。產出 data/variants.tsv。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tsv } from './lib/text';
import { normHan } from './lib/book';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');
const WORKS = new Set(['KP', 'GL', 'YH']);

const tracks = readFileSync(join(DATA, 'tracks-zh.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const clauseText = new Map<string, string>();
for (const r of tracks) if (r[4] === 'clause') clauseText.set(r[1]!, (clauseText.get(r[1]!) ?? '') + r[11]);

const wit = readFileSync(join(DATA, 'tracks-witness.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const witText = new Map(wit.map((r) => [r[0]!, r[7]!]));

const x = readFileSync(join(DATA, 'xref.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));

type Op = { a: string; b: string; ai: number };
function diff(a: string, b: string): Op[] {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const out: Op[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; continue; }
    const start = i;
    let aa = '', bb = '';
    while (i < n && j < m && a[i] !== b[j]) {
      if (dp[i + 1]![j]! >= dp[i]![j + 1]!) { aa += a[i++]; } else { bb += b[j++]; }
    }
    out.push({ a: aa, b: bb, ai: start });
  }
  if (i < n || j < m) out.push({ a: a.slice(i), b: b.slice(j), ai: i });
  return out;
}

const rows: string[][] = [['witness', 'clause', 'sb_context', 'witness_context', 'sb_diff', 'wt_diff', 'confidence']];
for (const r of x) {
  const work = r[0]!;
  if (!WORKS.has(work) || r[6] !== '1:1' || !['A', 'B'].includes(r[7]!)) continue;
  const c0 = +r[4]!.slice(1, 5);
  const sb = normHan(clauseText.get(`S${String(c0).padStart(4, '0')}`) ?? '');
  const wt = normHan(witText.get(`${work}.${r[1]}`) ?? '');
  if (!sb || !wt) continue;
  const hunks = diff(sb, wt).filter((h) => (h.a + h.b).length > 0);
  if (!hunks.length) continue;
  // 只留 1–4 字的替換／增刪，過濾整條重寫
  const real = hunks.filter((h) => h.a.length <= 4 && h.b.length <= 4);
  if (!real.length) continue;
  for (const h of real.slice(0, 3)) {
    const k = h.ai;
    rows.push([
      work, String(c0),
      sb.slice(Math.max(0, k - 4), Math.min(sb.length, k + h.a.length + 4)),
      wt.slice(Math.max(0, k - 4), Math.min(wt.length, k + h.b.length + 4)),
      h.a, h.b, r[7]!,
    ]);
  }
}

writeFileSync(join(DATA, 'variants.tsv'), tsv(rows));
const byW: Record<string, number> = {};
for (const r of rows.slice(1)) byW[r[0]!] = (byW[r[0]!] ?? 0) + 1;
console.log(`variants ${rows.length - 1}`, byW);
console.log(rows.slice(1, 8).map((r) => r.slice(0, 6).join('\t')).join('\n'));


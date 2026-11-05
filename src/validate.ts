#!/usr/bin/env bun
/**
 * 資料驗證：軌號、cuts、hierarchy、xref、witnesses。
 *
 *   bun run src/validate.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');
const errors: string[] = [];
const warns: string[] = [];
const ok = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

const tsv = (f: string) => readFileSync(join(DATA, f), 'utf8').trim().split('\n').map((l) => l.split('\t'));
const tracks = tsv('tracks-zh.tsv');
const th = Object.fromEntries(tracks[0]!.map((h, i) => [h, i]));
const trows = tracks.slice(1);

const ids = new Set<string>();
const byBase = new Map<string, number[]>();
for (const r of trows) {
  const id = r[th.track_id!]!;
  ok(!ids.has(id), `track_id 重複：${id}`);
  ids.add(id);
  ok(/^[SX]\d{4}\.\d+$/.test(id), `track_id 格式：${id}`);
  const base = r[th.base_sid!]!;
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base)!.push(+r[th.part!]!);
}
for (const [base, parts] of byBase) {
  parts.sort((a, b) => a - b);
  ok(parts[0] === 1, `${base} part 不是從 1 開始`);
  parts.forEach((p, i) => ok(p === i + 1, `${base} part 不連續：${parts.join(',')}`));
}

// 398 條齊全
const clauseNos = [...byBase.keys()].filter((b) => b.startsWith('S')).map((b) => +b.slice(1)).sort((a, b) => a - b);
ok(clauseNos.length === 398, `條文 base 數 ${clauseNos.length} ≠ 398`);
for (let n = 1; n <= 398; n++) ok(clauseNos.includes(n), `缺第 ${n} 條`);

// cuts 與軌相鄰
const cuts = tsv('cuts.tsv');
const ch = Object.fromEntries(cuts[0]!.map((h, i) => [h, i]));
const crows = cuts.slice(1);
ok(crows.length === trows.length - 1, `cuts ${crows.length} ≠ tracks-1 ${trows.length - 1}`);
const order = new Map(trows.map((r, i) => [r[th.track_id!]!, i]));
for (const r of crows) {
  const a = order.get(r[ch.before_track!]!);
  const b = order.get(r[ch.after_track!]!);
  ok(a !== undefined && b !== undefined && b === a! + 1, `cut ${r[ch.cut_id!]} 兩側不相鄰`);
}

// hierarchy
const H = JSON.parse(readFileSync(join(DATA, 'hierarchy.json'), 'utf8')) as {
  roots: string[]; nodes: { id: string; level: number; parent: string | null; children: string[]; start: number; end: number }[];
};
const hmap = new Map(H.nodes.map((n) => [n.id, n]));
ok(H.roots.length === 1, `hierarchy roots ${H.roots.length} ≠ 1`);
for (const n of H.nodes) {
  if (n.parent) ok(hmap.has(n.parent), `${n.id} parent 不存在`);
  for (const c of n.children) ok(hmap.has(c), `${n.id} child ${c} 不存在`);
  ok(n.start >= 1 && n.end <= trows.length && n.start <= n.end, `${n.id} 範圍 ${n.start}-${n.end} 不合法`);
}

// xref
const xref = tsv('xref.tsv');
const xh = Object.fromEntries(xref[0]!.map((h, i) => [h, i]));
let xOk = 0;
for (const r of xref.slice(1)) {
  const a = order.get(r[xh.track_start!]!);
  const b = order.get(r[xh.track_end!]!);
  ok(a !== undefined && b !== undefined && a! <= b!, `xref ${r[xh.work_id!]} 軌號不存在或顛倒`);
  if (a !== undefined && b !== undefined) xOk++;
}

// witnesses
const wit = tsv('witnesses.tsv');
const wh = Object.fromEntries(wit[0]!.map((h, i) => [h, i]));
for (const r of wit.slice(1)) {
  if (r[wh.status!] === 'downloaded') {
    const f = r[wh.local_file!]!;
    ok(!!f && existsSync(join(DATA, 'sources', f)), `witness ${r[wh.witness_id!]} 檔案不存在：${f}`);
  }
}

// witness realization tracks 與 align 的 track_b
const wt = tsv('tracks-witness.tsv');
const wth = Object.fromEntries(wt[0]!.map((h, i) => [h, i]));
const wid = new Set<string>();
for (const r of wt.slice(1)) {
  const id = r[wth.track_id!]!;  ok(!wid.has(id), `witness track_id 重複：${id}`);
  wid.add(id);
}
const al = tsv('align.tsv');
const ah = Object.fromEntries(al[0]!.map((h, i) => [h, i]));
for (const r of al.slice(1)) {
  if (r[ah.relation!] === 'gap') continue;
  const b = r[ah.track_b!]!;
  ok(!b || wid.has(b), `align track_b 不存在：${b}`);
}

// 派生索引
const cl = tsv('clauses.tsv');
const clh = Object.fromEntries(cl[0]!.map((h, i) => [h, i]));
ok(cl.length - 1 === 398, `clauses.tsv ${cl.length - 1} ≠ 398`);
const cnos = new Set<number>();
for (const r of cl.slice(1)) {
  const n = +r[clh.clause_no!]!;
  ok(n >= 1 && n <= 398 && !cnos.has(n), `clauses.tsv 條號重複或越界：${n}`);
  cnos.add(n);
  ok(order.has(r[clh.track_start!]!) && order.has(r[clh.track_end!]!), `clauses.tsv 軌號不存在：${n}`);
}
const sec = tsv('sections.tsv');
const sh = Object.fromEntries(sec[0]!.map((h, i) => [h, i]));
let expect = 0;
for (const r of sec.slice(1)) {
  const a = order.get(r[sh.track_start!]!);
  const b = order.get(r[sh.track_end!]!);
  ok(a === expect, `sections.tsv 不連續：${r[sh.pian!]}`);
  expect = (b ?? 0) + 1;
}
ok(expect === trows.length, `sections.tsv 未覆蓋全部軌：end ${expect}`);
const fm = tsv('formulas.tsv');
const fh = Object.fromEntries(fm[0]!.map((h, i) => [h, i]));
for (const r of fm.slice(1)) {
  for (const k of ['title_track', 'ingredient_track']) {
    const v = r[fh[k]!];
    if (v) ok(order.has(v), `formulas.tsv ${r[fh.formula!]} ${k} 不存在：${v}`);
  }
  for (const v of (r[fh.method_tracks!] ?? '').split(',').filter(Boolean)) {
    ok(order.has(v), `formulas.tsv ${r[fh.formula!]} method 不存在：${v}`);
  }
}
const vr = tsv('variants.tsv');
ok(vr.length - 1 > 0, 'variants.tsv 空');

console.log(`tracks ${trows.length}（${byBase.size} base）`);
console.log(`cuts ${crows.length}`);
console.log(`hierarchy nodes ${H.nodes.length}`);
console.log(`xref rows ${xref.length - 1}（軌號可解析 ${xOk}）`);
console.log(`witness tracks ${wt.length - 1}；align ${al.length - 1}`);
console.log(`witnesses ${wit.length - 1}`);
if (warns.length) console.log('WARN\n' + warns.join('\n'));
if (errors.length) {
  console.error(`ERROR ${errors.length}\n` + errors.slice(0, 30).join('\n'));
  process.exit(1);
}
console.log('OK');

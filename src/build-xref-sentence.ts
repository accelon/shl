#!/usr/bin/env bun
/**
 * 句級 xref pilot：注疏句 → 宋本句軌。
 *
 *   bun run src/build-xref-sentence.ts
 *
 * 做法：對每個條級 xref row，把注疏 span 切句；每句在該條的 sentence tracks 裡
 * 找 4-gram 覆蓋率最高的；>=0.5 記 quote，否則記 whole（掛該條第一句）。
 * 產出 data/xref-sentence.tsv。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBook } from './lib/book';
import { gramCoverage, splitSentences, tsv } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');
const WORKS = ['ZJ', 'TB', 'SL', 'LSZ', 'GZ', 'QZ', 'JY', 'JC'] as const;
const FILES: Record<string, string> = {
  ZJ: 'zhujie', TB: '傷寒論條辨', SL: '尚論篇', LSZ: '傷寒論註來蘇集',
  GZ: '傷寒貫珠集', QZ: '傷寒論淺註補正', JY: '傷寒論輯義', JC: '傷寒論集成',
};

const tsvRows = (f: string) => readFileSync(join(DATA, f), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t'));
const tracks = tsvRows('tracks-zh.tsv');
const xref = tsvRows('xref.tsv');

const byBase = new Map<string, { id: string; text: string }[]>();
for (const r of tracks) {
  if (r[4] !== 'clause') continue;
  if (!byBase.has(r[1]!)) byBase.set(r[1]!, []);
  byBase.get(r[1]!).push({ id: r[0]!, text: r[11]! });
}

const out: string[][] = [['work_id', 'source_start', 'source_end', 'source_ord', 'shl_track', 'coverage', 'kind', 'text']];
let total = 0, quote = 0;

for (const work of WORKS) {
  const book = parseBook(join(DATA, 'sources', `${FILES[work]}.html`));
  const paras = new Map<string, { idx: number; text: string }>();
  for (const p of book.paras) {
    paras.set(p.id || `p${p.idx}`, p);
    paras.set(`p${p.idx}`, p);
  }
  for (const r of xref) {
    if (r[0] !== work || r[6] === 'gap' || !r[1]) continue;
    const start = paras.get(r[1]!);
    const end = paras.get(r[2]!);
    if (!start || !end) continue;
    const units = byBase.get(r[4]!.slice(0, 5)) ?? [];
    if (!units.length) continue;
    // span 內的段落；最多 8 段
    const span = book.paras.filter((p) => p.idx >= start.idx && p.idx <= end.idx).slice(0, 8);
    const comments: string[] = [];
    for (const p of span) for (const s of splitSentences(p.text)) comments.push(s);
    if (!comments.length) continue;
    const sim = comments.map((s) => units.map((u) => gramCoverage(s, u.text, 4)));
    // 以單調 greedy 找高信度錨點（comment i -> unit j）
    const anchor = new Map<number, { j: number; sc: number }>();
    let lastJ = -1;
    for (let i = 0; i < comments.length; i++) {
      let bj = -1, bs = 0;
      for (let j = Math.max(0, lastJ); j < units.length; j++) {
        const sc = sim[i]![j]!;
        if (sc > bs) { bs = sc; bj = j; }
      }
      if (bj >= 0 && bs >= 0.45) { anchor.set(i, { j: bj, sc: bs }); lastJ = bj; }
    }
    const ais = [...anchor.keys()];
    for (let i = 0; i < comments.length; i++) {
      let j: number, kind: string, sc = 0;
      if (anchor.has(i)) {
        j = anchor.get(i)!.j; sc = anchor.get(i)!.sc; kind = 'quote';
      } else if (!ais.length) {
        j = Math.floor((i * units.length) / comments.length); kind = 'spread';
      } else {
        const prev = ais.filter((x) => x < i).at(-1);
        const next = ais.find((x) => x > i);
        if (prev !== undefined && next !== undefined) {
          const a = anchor.get(prev)!, b = anchor.get(next)!;
          j = Math.round(a.j + ((i - prev) / (next - prev)) * (b.j - a.j));
          kind = 'interp';
        } else if (prev !== undefined) {
          j = anchor.get(prev)!.j; kind = 'tail';
        } else {
          j = anchor.get(next!)!.j; kind = 'lead';
        }
        j = Math.max(0, Math.min(units.length - 1, j));
        sc = sim[i]![j]!;
      }
      if (kind === 'quote') quote++; else total++;
      total++;
      out.push([work, r[1]!, r[2]!, String(i), units[j]!.id, sc.toFixed(2), kind, comments[i]!.slice(0, 80)]);
    }
  }
}

writeFileSync(join(DATA, 'xref-sentence.tsv'), tsv(out));
console.log(`sentence xref ${out.length - 1}（quote ${quote}／其他 ${out.length - 1 - quote}）→ data/xref-sentence.tsv`);

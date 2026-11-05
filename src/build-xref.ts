#!/usr/bin/env bun
/**
 * 建注疏／別本的 crosswalk：每一部書的段落 → 宋本條號（→ 軌號 range）。
 *
 *   bun run src/build-xref.ts
 *
 * 方法：4-gram 倒排索引，取每條的最佳段落；連續條文共用段落時合併為一個 source unit。
 * 只存「來源段落 ↔ 軌號」的對映，不复制原文；原文留在 data/sources（唯讀）。
 *
 * 產出：data/xref.tsv、data/xref-summary.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBook, normHan } from './lib/book';
import { parseJcXml } from './lib/jcbook';
import { tsv } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');

type TrackRow = {
  track_id: string; base_sid: string; part: number; display_sid: number; kind: string;
  text: string; clause_no: string;
};
const rows = readFileSync(join(DATA, 'tracks-zh.tsv'), 'utf8').trim().split('\n').slice(1);
const tracks: TrackRow[] = rows.map((l) => {
  const c = l.split('\t');
  return {
    track_id: c[0]!, base_sid: c[1]!, part: +c[2]!, display_sid: +c[3]!, kind: c[4]!,
    text: c[11]!, clause_no: c[9]!,
  };
});

type Clause = { no: number; text: string; trackStart: string; trackEnd: string; sidStart: number; sidEnd: number };
const byBase = new Map<string, TrackRow[]>();
for (const t of tracks) {
  if (!byBase.has(t.base_sid)) byBase.set(t.base_sid, []);
  byBase.get(t.base_sid)!.push(t);
}
const clauses: Clause[] = [];
for (const [base, list] of byBase) {
  if (!base.startsWith('S')) continue;
  const sorted = list.filter((t) => t.kind === 'clause').sort((a, b) => a.part - b.part);
  if (!sorted.length) continue;
  clauses.push({
    no: +base.slice(1),
    text: sorted.map((t) => t.text).join(''),
    trackStart: sorted[0]!.track_id,
    trackEnd: sorted.at(-1)!.track_id,
    sidStart: sorted[0]!.display_sid,
    sidEnd: sorted.at(-1)!.display_sid,
  });
}
clauses.sort((a, b) => a.no - b.no);

type Work = { id: string; title: string; file: string; kind: 'commentary' | 'recension'; threshold: number; order: 'mono' | 'free'; note: string; filter?: RegExp; parser?: 'html' | 'jc' };
const works: Work[] = [
  { id: 'ZJ', title: '註解傷寒論', file: 'zhujie', kind: 'commentary', threshold: 0.5, order: 'mono', note: '成無己；經文＋注文相間' },
  { id: 'KP', title: '古本康平傷寒論', file: 'kangping', kind: 'recension', threshold: 0.45, order: 'mono', note: '康平本' },
  { id: 'GL', title: '傷寒雜病論（桂林古本）', file: 'guilin', kind: 'recension', threshold: 0.45, order: 'free', note: '桂林古本；編次不同' },
  { id: 'YH', title: '金匱玉函經', file: 'yuhan', kind: 'recension', threshold: 0.45, order: 'free', note: '金匱玉函經' },
  { id: 'TB', title: '傷寒論條辨', file: '傷寒論條辨', kind: 'commentary', threshold: 0.5, order: 'free', note: '方有執；重編條次' },
  { id: 'SL', title: '尚論篇', file: '尚論篇', kind: 'commentary', threshold: 0.5, order: 'free', note: '喻昌；按法重編' },
  { id: 'LSZ', title: '傷寒論註來蘇集', file: '傷寒論註來蘇集', kind: 'commentary', threshold: 0.5, order: 'free', note: '柯琴' },
  { id: 'GZ', title: '傷寒貫珠集', file: '傷寒貫珠集', kind: 'commentary', threshold: 0.5, order: 'free', note: '尤怡；按法類編' },
  { id: 'QZ', title: '傷寒論淺註補正', file: '傷寒論淺註補正', kind: 'commentary', threshold: 0.5, order: 'mono', note: '陳修園／唐容川' },
  { id: 'JY', title: '傷寒論輯義', file: '傷寒論輯義', kind: 'commentary', threshold: 0.5, order: 'mono', note: '丹波元簡；集注' },
  { id: 'JC', title: '傷寒論集成', file: '傷寒論集成', kind: 'commentary', threshold: 0.5, order: 'mono', note: '山田正珍' },
  { id: 'SYJ', title: '傷寒溯源集', file: '傷寒溯源集', kind: 'commentary', threshold: 0.5, order: 'free', note: '錢潢' },
  { id: 'XJ', title: '傷寒懸解', file: '傷寒懸解', kind: 'commentary', threshold: 0.5, order: 'free', note: '黃元御' },
  { id: 'GM', title: '傷寒論綱目', file: '傷寒論綱目', kind: 'commentary', threshold: 0.5, order: 'free', note: '沈金鰲；按證類編' },
  { id: 'ZZ', title: '張卿子傷寒論', file: '張卿子傷寒論', kind: 'commentary', threshold: 0.5, order: 'mono', note: '張遂辰（張卿子）' },
  { id: 'HZ', title: '傷寒論彙註精華', file: '傷寒論彙註精華', kind: 'commentary', threshold: 0.5, order: 'mono', note: '彙註' },
  { id: 'LF', title: '傷寒論類方', file: '傷寒論類方', kind: 'commentary', threshold: 0.5, order: 'free', note: '徐大椿；按方類編' },
  { id: 'HR', title: '類證活人書', file: '類證活人書', kind: 'commentary', threshold: 0.5, order: 'free', note: '朱肱；類證，非逐條' },
  { id: 'MJ', title: '脈經（卷七–八）', file: 'maijing', kind: 'recension', threshold: 0.45, order: 'free', note: '王叔和；可不可／痙濕暍，非連續條文', filter: /^卷[七八]$/ },
  { id: 'QY', title: '千金翼方（卷九–十）', file: 'qianjin', kind: 'recension', threshold: 0.45, order: 'free', note: '孫思邈；按方類編', filter: /^卷第九|^卷第十/ },
  { id: 'WT', title: '外臺秘要（卷一–二）', file: '外臺秘要', kind: 'recension', threshold: 0.45, order: 'free', note: '王燾；按方證類編', filter: /^卷第一$|^卷第二$/ },
  { id: 'SHF', title: '太平聖惠方（卷八–十）', file: '太平聖惠方', kind: 'recension', threshold: 0.45, order: 'free', note: '淳化本系統；傷寒八至十卷', filter: /^卷第[八九十]$/ },
  { id: 'BW', title: '仲景傷寒補亡論', file: '仲景傷寒補亡論', parser: 'jc', kind: 'commentary', threshold: 0.5, order: 'mono', note: '郭雍；jc.adb 抽出' },
  { id: 'CYF', title: '曹氏傷寒金匱發微合刊', file: '曹氏傷寒金匱發微合刊', parser: 'jc', kind: 'commentary', threshold: 0.5, order: 'mono', note: '曹穎甫；jc.adb 抽出' },
];

function grams(s: string, n = 4): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= s.length; i++) out.push(s.slice(i, i + n));
  return out;
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

type Xref = {
  work_id: string; source_start: string; source_end: string; source_label: string;
  track_start: string; track_end: string; relation: string; confidence: string;
  coverage: number; method: string; note: string;
};

const out: Xref[] = [];
const summary: any = { works: {}, clauses: clauses.length, generated_at: new Date().toISOString() };

for (const w of works) {
  let book;
  try {
    book = w.parser === 'jc'
      ? { paras: parseJcXml(join(ROOT, 'out', 'jc-books', `${w.file}.xml`)) }
      : parseBook(join(DATA, 'sources', `${w.file}.html`));
  } catch (e) {
    console.log(`skip ${w.id}: ${(e as Error).message}`);
    continue;
  }
  const paras = w.filter ? book.paras.filter((p) => w.filter!.test(p.path[0] ?? '')) : book.paras;
  const P = paras.map((p) => normHan(p.text));
  const index = new Map<string, number[]>();
  P.forEach((txt, i) => {
    for (const g of new Set(grams(txt))) {
      if (!index.has(g)) index.set(g, []);
      index.get(g)!.push(i);
    }
  });

  const anchors: number[] = new Array(clauses.length).fill(-1);
  const scores: number[] = new Array(clauses.length).fill(0);
  const cands: { i: number; sc: number }[][] = [];
  const hits = new Map<number, number[]>(); // 段落 → 哪些條在此有候選

  for (let k = 0; k < clauses.length; k++) {
    const key = normHan(clauses[k]!.text);
    const gs = [...new Set(grams(key))];
    const score = new Float32Array(P.length);
    for (const g of gs) for (const i of index.get(g) ?? []) score[i]!++;
    let best = 0;
    const cand: { i: number; sc: number }[] = [];
    for (let i = 0; i < P.length; i++) {
      const sc = score[i]! / Math.max(1, gs.length);
      if (sc > best) best = sc;
      if (sc >= w.threshold) cand.push({ i, sc });
    }
    // 每條最多留 10 個候選（分數高者），避免重複引文太多
    cand.sort((a, b) => b.sc - a.sc);
    const top = cand.slice(0, 10);
    cands.push(top);
    for (const c of top) {
      if (!hits.has(c.i)) hits.set(c.i, []);
      hits.get(c.i)!.push(k);
    }
    scores[k] = best;
  }

  if (w.order === 'mono') {
    // 加權最長遞增序列：在全書候選中找一條單調、總分最高的路徑；
    // 允許跳條（gap），避免單一重複引文把整段拉走。
    type Cand = { k: number; i: number; sc: number; prev: number; path: number };
    const list: Cand[] = [];
    const endScore = new Float32Array(P.length).fill(-1);
    const endCand = new Int32Array(P.length).fill(-1);
    const prefVal = new Float32Array(P.length).fill(-1);
    const prefArg = new Int32Array(P.length).fill(-1);
    const rebuild = () => {
      let bv = -1, ba = -1;
      for (let i = 0; i < P.length; i++) {
        if (endScore[i]! > bv) { bv = endScore[i]!; ba = endCand[i]!; }
        prefVal[i] = bv; prefArg[i] = ba;
      }
    };
    for (let k = 0; k < clauses.length; k++) {
      for (const c of cands[k]!) {
        const id = list.length;
        const prevId = prefArg[c.i]!;
        const base = prevId >= 0 ? prefVal[c.i]! : 0;
        list.push({ k, i: c.i, sc: c.sc, prev: prevId, path: c.sc + base });
        if (list[id]!.path > endScore[c.i]!) {
          endScore[c.i] = list[id]!.path;
          endCand[c.i] = id;
        }
      }
      rebuild();
    }
    let bi = -1, bv = -1;
    for (let i = 0; i < P.length; i++) if (endScore[i]! > bv) { bv = endScore[i]!; bi = endCand[i]!; }
    let id = bi;
    while (id >= 0) {
      const c = list[id]!;
      anchors[c.k] = c.i;
      id = c.prev;
    }
  } else {
    for (let k = 0; k < clauses.length; k++) {
      const c = cands[k]!;
      if (c.length) anchors[k] = c[0]!.i;
    }
  }

  // 以「連續條文 + 同一/遞增 anchor」分群；每群的 source 範圍到下一群 anchor 前一段
  type Group = { i0: number; i1: number; a: number; aEnd: number };
  const groups: Group[] = [];
  let cur: Group | null = null;
  for (let k = 0; k < clauses.length; k++) {
    const a = anchors[k]!;
    if (a < 0) {
      if (cur && cur.a < 0 && cur.i1 === k - 1) { cur.i1 = k; continue; }
      if (cur) groups.push(cur);
      cur = { i0: k, i1: k, a: -1, aEnd: -1 };
      continue;
    }
    if (cur && cur.a >= 0 && a === cur.a) {
      cur.i1 = k;
      cur.aEnd = a;
    } else {
      if (cur) groups.push(cur);
      cur = { i0: k, i1: k, a, aEnd: a };
    }
  }
  if (cur) groups.push(cur);

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!;
    const c0 = clauses[g.i0]!;
    const c1 = clauses[g.i1]!;
    const cov = scores.slice(g.i0, g.i1 + 1).reduce((a, b) => a + b, 0) / (g.i1 - g.i0 + 1);
    if (g.a < 0) {
      out.push({
        work_id: w.id, source_start: '', source_end: '',
        source_label: `${c0.no}-${c1.no} 未定位`,
        track_start: c0.trackStart, track_end: c1.trackEnd,
        relation: 'gap', confidence: 'C', coverage: +cov.toFixed(2), method: 'none', note: w.note,
      });
      continue;
    }
    const next = groups.slice(gi + 1).find((x) => x.a >= g.a && x.a > g.aEnd);
    // 由 anchor 往後延伸注文，但只要遇到「別條的候選段落」就停，
    // 避免把下一條（或重編本他處的條文）吞進本條。
    let limit = next ? Math.min(next.a - 1, g.a + 12) : g.a;
    for (let p = g.a + 1; p <= limit; p++) {
      // 條辨等書用「（十一）」標條；遇到新條號就停
      if (/^（[一二三四五六七八九十百〇零]+）/.test(paras[p]!.text)) { limit = p - 1; break; }
      const hs = hits.get(p) ?? [];
      if (hs.some((k) => k < g.i0 || k > g.i1)) { limit = p - 1; break; }
    }
    const spanEnd = Math.max(g.a, limit);
    const start = paras[g.a]!;
    const end = paras[spanEnd]!;
    const nClauses = g.i1 - g.i0 + 1;
    const nParas = spanEnd - g.a + 1;
    const relation = nClauses === 1 && nParas === 1 ? '1:1' : nClauses === 1 ? '1:n' : nParas === 1 ? 'n:1' : 'n:m';
    const conf = cov >= 0.85 ? 'A' : cov >= 0.65 ? 'B' : 'C';
    const label = `${start.path.join(' / ')}${start.id ? ` #${start.id}` : ` @${start.idx}`}`;
    out.push({
      work_id: w.id,
      source_start: start.id || `p${start.idx}`,
      source_end: end.id || `p${end.idx}`,
      source_label: label,
      track_start: c0.trackStart,
      track_end: c1.trackEnd,
      relation, confidence: conf,
      coverage: +cov.toFixed(2),
      method: w.order === 'mono' ? 'best-monotonic' : 'best-global',
      note: w.note,
    });
  }

  const mapped = anchors.filter((a) => a >= 0).length;
  const dist: Record<string, number> = { A: 0, B: 0, C: 0 };
  for (const s of scores) dist[s >= 0.85 ? 'A' : s >= 0.65 ? 'B' : 'C']!++;
  summary.works[w.id] = {
    title: w.title, kind: w.kind, paragraphs: paras.length, clauses_mapped: mapped,
    coverage_pct: +((mapped / clauses.length) * 100).toFixed(1),
    grade: dist, avg_score: +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3),
  };
  console.log(`${w.id}\t${w.title}\t段落 ${paras.length}\t定位 ${mapped}/${clauses.length}\t${summary.works[w.id].coverage_pct}%`);
}

const head = ['work_id', 'source_start', 'source_end', 'source_label', 'track_start', 'track_end', 'relation', 'confidence', 'coverage', 'method', 'note'];
writeFileSync(join(DATA, 'xref.tsv'), tsv([head, ...out.map((r) => [r.work_id, r.source_start, r.source_end, r.source_label, r.track_start, r.track_end, r.relation, r.confidence, r.coverage, r.method, r.note])]));
summary.xref_rows = out.length;
summary.gap_rows = out.filter((r) => r.relation === 'gap').length;
writeFileSync(join(DATA, 'xref-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(`xref rows ${out.length}; gaps ${summary.gap_rows}; → data/xref.tsv`);



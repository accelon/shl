#!/usr/bin/env bun
/**
 * 由 data/songben.json 發軌號，建 cuts / hierarchy。
 *
 *   bun run src/build-tracks.ts
 *
 * 軌號規則（見 docs/track-scheme.md）：
 *   條文   S0001.1 … S0398.n   base_sid = 宋本條號
 *   非條文 X0001.1 …           base_sid = 卷首／篇內段落序（全書連續）
 *   方     接在所屬條／段之後，part 續編，kind=formula-*
 *
 * 產出：data/tracks-zh.tsv、data/cuts.tsv、data/hierarchy.json、
 *       data/tracks-summary.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitSentences, tsv, tsvCell } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');

type Note = { kind: string; text: string };
type Block =
  | { type: 'clause'; no: number; text: string; notes: Note[] }
  | { type: 'para'; text: string; notes: Note[] }
  | { type: 'formula'; name: string; lines: { role: string; text: string; notes: Note[] }[] };
type Pian = { no: number; label: string; blocks: Block[] };
type Juan = { no: number; label: string; pian: Pian[] };
type Doc = { witness: string; title: string; front: Pian[]; juan: Juan[] };

const doc = JSON.parse(readFileSync(join(DATA, 'songben.json'), 'utf8')) as Doc;

type Track = {
  track_id: string;
  base_sid: string;
  part: number;
  display_sid: number;
  kind: string;
  lang: string;
  source: string;
  juan: string;
  pian: string;
  pian_seq: number;
  clause_no: string;
  formula: string;
  text: string;
  notes: string;
  chars: number;
};

const tracks: Track[] = [];
let xSeq = 0;
let display = 0;

function noteStr(notes: Note[]): string {
  return notes.map((n) => `${n.kind}:${n.text}`).join('｜');
}

function push(
  base: string,
  part: number,
  kind: string,
  ctx: { juan: string; pian: string; pianSeq: number; clauseNo?: string; formula?: string },
  text: string,
  notes: string,
) {
  display++;
  tracks.push({
    track_id: `${base}.${part}`,
    base_sid: base,
    part,
    display_sid: display,
    kind,
    lang: 'zh',
    source: 'SB',
    juan: ctx.juan,
    pian: ctx.pian,
    pian_seq: ctx.pianSeq,
    clause_no: ctx.clauseNo ?? '',
    formula: ctx.formula ?? '',
    text,
    notes,
    chars: text.length,
  });
}

const juan0: Juan = { no: 0, label: '卷首', pian: doc.front };
const allJuan = [juan0, ...doc.juan];

for (const juan of allJuan) {
  for (const pian of juan.pian) {
    let lastBase = '';
    for (const block of pian.blocks) {
      const ctxBase = { juan: juan.label, pian: pian.label, pianSeq: pian.no };
      if (block.type === 'clause') {
        const base = `S${String(block.no).padStart(4, '0')}`;
        lastBase = base;
        const sents = splitSentences(block.text);
        sents.forEach((s, i) =>
          push(base, i + 1, 'clause', { ...ctxBase, clauseNo: String(block.no) }, s, i === 0 ? noteStr(block.notes) : ''),
        );
      } else if (block.type === 'para') {
        const base = `X${String(++xSeq).padStart(4, '0')}`;
        lastBase = base;
        const sents = splitSentences(block.text);
        sents.forEach((s, i) => push(base, i + 1, 'para', ctxBase, s, i === 0 ? noteStr(block.notes) : ''));
      } else {
        // 方：掛在最近一個條／段上
        const base = lastBase;
        if (!base) throw new Error(`方「${block.name}」沒有所屬條`);
        const prevPart = tracks.filter((t) => t.base_sid === base).length;
        let part = prevPart;
        push(base, ++part, 'formula-title', { ...ctxBase, formula: block.name }, block.name, '');
        block.lines.forEach((line, li) => {
          const kind = `formula-${line.role}`;
          if (line.role === 'ingredients' || line.role === 'name-tail') {
            push(base, ++part, kind, { ...ctxBase, formula: block.name }, line.text, noteStr(line.notes));
            return;
          }
          for (const s of splitSentences(line.text)) {
            push(base, ++part, kind, { ...ctxBase, formula: block.name }, s, li === 0 ? noteStr(line.notes) : '');
          }
        });
      }
    }
  }
}

// ---------- cuts ----------
type Cut = {
  cut_id: string;
  before_track: string;
  after_track: string;
  kind: string;
  level: number;
  support: number;
  evidence: string;
  note: string;
};
const cuts: Cut[] = [];
for (let i = 1; i < tracks.length; i++) {
  const a = tracks[i - 1]!;
  const b = tracks[i]!;
  let kind: string;
  let level: number;
  let evidence: string;
  let note = '';
  if (a.pian_seq !== b.pian_seq) {
    kind = 'pian';
    level = 2;
    evidence = `SB:P${String(b.pian_seq).padStart(2, '0')}`;
    note = `${a.pian} → ${b.pian}`;
  } else if (a.base_sid !== b.base_sid) {
    const isClause = b.base_sid.startsWith('S');
    kind = isClause ? 'tiao' : 'duan';
    level = 3;
    evidence = isClause ? `SB:T${b.clause_no.padStart(3, '0')}` : `SB:${b.base_sid}`;
    note = `${a.juan}/${a.pian}`;
  } else {
    const isFormula = b.kind.startsWith('formula');
    kind = 'editorial';
    level = 4;
    evidence = isFormula ? 'SB:formula' : 'SB:punct';
    note = isFormula ? `方：${b.formula}` : '句讀';
  }
  cuts.push({
    cut_id: `C${String(cuts.length + 1).padStart(5, '0')}`,
    before_track: a.track_id,
    after_track: b.track_id,
    kind,
    level,
    support: 1,
    evidence,
    note,
  });
}

// ---------- hierarchy ----------
type HNode = {
  id: string;
  level: number;
  label: string;
  parent: string | null;
  children: string[];
  start: number;
  end: number;
  kind: string;
  base_sid: string;
};
const nodes: HNode[] = [];
const roots: string[] = [];
let hid = 0;
const h = (
  level: number,
  label: string,
  parent: string | null,
  kind: string,
  base = '',
): HNode => {
  const n: HNode = {
    id: `H${String(++hid).padStart(4, '0')}`,
    level,
    label,
    parent,
    children: [],
    start: 0,
    end: 0,
    kind,
    base_sid: base,
  };
  nodes.push(n);
  if (parent) nodes.find((x) => x.id === parent)!.children.push(n.id);
  else roots.push(n.id);
  return n;
};

let hyXSeq = 0;
const bookRoot = h(0, doc.title, null, 'book');
for (const juan of allJuan) {
  const jn = h(1, juan.label, bookRoot.id, 'juan');
  for (const pian of juan.pian) {
    const pn = h(2, pian.label, jn.id, 'pian');
    for (const block of pian.blocks) {
      if (block.type === 'clause') {
        const base = `S${String(block.no).padStart(4, '0')}`;
        h(3, `第${block.no}條`, pn.id, 'tiao', base);
      } else if (block.type === 'para') {
        const base = `X${String(++hyXSeq).padStart(4, '0')}`;
        h(3, `段 ${base.slice(1)}`, pn.id, 'duan', base);
      } else {
        continue;
      }
    }
    // 用 track 的 base_sid 回填範圍
    const own = tracks.filter((t) => t.pian_seq === pian.no);
    pn.start = own[0]?.display_sid ?? 0;
    pn.end = own.at(-1)?.display_sid ?? 0;
    for (const child of nodes.filter((n) => n.parent === pn.id)) {
      const ts = tracks.filter((t) => t.base_sid === child.base_sid);
      child.start = ts[0]?.display_sid ?? 0;
      child.end = ts.at(-1)?.display_sid ?? 0;
    }
    jn.start = Math.min(jn.start || 1e9, pn.start);
    jn.end = Math.max(jn.end, pn.end);
  }
}
bookRoot.start = 1;
bookRoot.end = tracks.length;

// ---------- 驗證 ----------
const ids = new Set(tracks.map((t) => t.track_id));
if (ids.size !== tracks.length) throw new Error('track_id 重複');
for (const t of tracks) {
  if (!/^[SX]\d{4}\.\d+$/.test(t.track_id)) throw new Error(`軌號格式錯：${t.track_id}`);
}
// 回組：每個 base 的 tracks 串起來要等於原 block（忽略注文）
let mismatch = 0;
for (const t of tracks) {
  const same = tracks.filter((x) => x.base_sid === t.base_sid && !x.kind.startsWith('formula'));
  const joined = same.map((x) => x.text).join('');
  const first = same[0]!;
  let orig = '';
  for (const juan of allJuan) {
    for (const pian of juan.pian) {
      if (pian.no !== first.pian_seq) continue;
      for (const b of pian.blocks) {
        if (b.type === 'formula') continue;
        const base = b.type === 'clause' ? `S${String(b.no).padStart(4, '0')}` : null;
        if (base === t.base_sid) orig = b.text;
      }
    }
  }
  if (orig && joined !== orig) mismatch++;
}
if (mismatch) throw new Error(`回組不一致：${mismatch} 個 base`);

const outTracks = [
  [
    'track_id', 'base_sid', 'part', 'display_sid', 'kind', 'lang', 'source',
    'juan', 'pian', 'clause_no', 'formula', 'text', 'notes', 'chars',
  ],
  ...tracks.map((t) => [
    t.track_id, t.base_sid, t.part, t.display_sid, t.kind, t.lang, t.source,
    t.juan, t.pian, t.clause_no, t.formula, t.text, t.notes, t.chars,
  ]),
];
writeFileSync(join(DATA, 'tracks-zh.tsv'), tsv(outTracks));

const outCuts = [
  ['cut_id', 'before_track', 'after_track', 'kind', 'level', 'support', 'evidence', 'note'],
  ...cuts.map((c) => [c.cut_id, c.before_track, c.after_track, c.kind, c.level, c.support, c.evidence, c.note]),
];
writeFileSync(join(DATA, 'cuts.tsv'), tsv(outCuts));

writeFileSync(
  join(DATA, 'hierarchy.json'),
  JSON.stringify({ witness: 'SB', roots, nodes }, null, 1) + '\n',
);

const byKind: Record<string, number> = {};
for (const t of tracks) byKind[t.kind] = (byKind[t.kind] ?? 0) + 1;
const cutByKind: Record<string, number> = {};
for (const c of cuts) cutByKind[c.kind] = (cutByKind[c.kind] ?? 0) + 1;
const summary = {
  witness: 'SB',
  tracks: tracks.length,
  bases: new Set(tracks.map((t) => t.base_sid)).size,
  clauses: new Set(tracks.filter((t) => t.kind === 'clause').map((t) => t.base_sid)).size,
  paras: new Set(tracks.filter((t) => t.kind === 'para').map((t) => t.base_sid)).size,
  formulas: new Set(tracks.filter((t) => t.formula).map((t) => t.formula)).size,
  by_kind: byKind,
  cuts: cuts.length,
  cuts_by_kind: cutByKind,
  hierarchy_nodes: nodes.length,
  chars: tracks.reduce((n, t) => n + t.chars, 0),
  long_sentences_80: tracks.filter((t) => t.chars > 80).length,
  max_track_chars: Math.max(...tracks.map((t) => t.chars)),
};
writeFileSync(join(DATA, 'tracks-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));

#!/usr/bin/env bun
/**
 * 凍結一個 draft rev：版本號、輸入／輸出 hash、counts。
 *
 *   bun run src/build-rev.ts [rev-id]
 *
 * 寫 data/rev.json 與 build/rev/<rev>/rev.json。
 * 注意：這不是 canonical freeze；軌號仍可能在下一 rev 增補（只增不改）。
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const DATA = join(ROOT, 'data');
const rev = process.argv[2] ?? '2026-11-05-d';

const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const files = [
  'songben.json', 'tracks-zh.tsv', 'cuts.tsv', 'hierarchy.json', 'xref.tsv',
  'witnesses.tsv', 'align.tsv', 'tracks-witness.tsv', 'xref-review.tsv', 'xref-hdnj.tsv', 'cut-review.tsv', 'variants.tsv', 'clauses.tsv', 'formulas.tsv', 'sections.tsv', 'herbs.tsv', 'glossary.tsv',
  'jc-catalog.tsv', 'jc-sources.tsv', 'skqs-med.tsv', 'xref-sentence.tsv',
  'tracks-summary.json', 'xref-summary.json', 'xref-audit.json',
];
const hashes: Record<string, string> = {};
for (const f of files) hashes[f] = sha(join(DATA, f));

const tracks = readFileSync(join(DATA, 'tracks-zh.tsv'), 'utf8').trim().split('\n').slice(1);
const cuts = readFileSync(join(DATA, 'cuts.tsv'), 'utf8').trim().split('\n').slice(1);
const xref = readFileSync(join(DATA, 'xref.tsv'), 'utf8').trim().split('\n').slice(1);
const wit = readFileSync(join(DATA, 'witnesses.tsv'), 'utf8').trim().split('\n').slice(1);
const align = readFileSync(join(DATA, 'align.tsv'), 'utf8').trim().split('\n').slice(1);
const cutKind: Record<string, number> = {};
for (const l of cuts) {
  const k = l.split('\t')[3]!;
  cutKind[k] = (cutKind[k] ?? 0) + 1;
}
const works = new Set(xref.map((l) => l.split('\t')[0]!));

const doc = {
  rev,
  status: 'draft',
  base_witness: 'SB',
  base_title: '傷寒論（宋本，中醫笈成／四部叢刊初編·註解傷寒論）',
  base_file: 'data/songben.json',
  source_file: 'data/sources/songben.html',
  source_sha256: sha(join(DATA, 'sources', 'songben.html')),
  frozen_at: new Date().toISOString(),
  counts: {
    tracks: tracks.length,
    clauses: new Set(tracks.map((l) => l.split('\t')[1]!).filter((b) => b.startsWith('S'))).size,
    cuts: cuts.length,
    cuts_by_kind: cutKind,
    hierarchy_nodes: JSON.parse(readFileSync(join(DATA, 'hierarchy.json'), 'utf8')).nodes.length,
    xref_rows: xref.length,
    xref_gap_rows: xref.filter((l) => l.split('\t')[6] === 'gap').length,
    xref_works: works.size,
    align_rows: align.length,
    witness_tracks: readFileSync(join(DATA, 'tracks-witness.tsv'), 'utf8').trim().split('\n').length - 1,
    review_rows: readFileSync(join(DATA, 'xref-review.tsv'), 'utf8').trim().split('\n').length - 1,
    sentence_rows: readFileSync(join(DATA, 'xref-sentence.tsv'), 'utf8').trim().split('\n').length - 1,
    skqs_books: readFileSync(join(DATA, 'skqs-med.tsv'), 'utf8').trim().split('\n').length - 1,
    cut_review_rows: readFileSync(join(DATA, 'cut-review.tsv'), 'utf8').trim().split('\n').length - 1,
    variant_rows: readFileSync(join(DATA, 'variants.tsv'), 'utf8').trim().split('\n').length - 1,
    clause_rows: readFileSync(join(DATA, 'clauses.tsv'), 'utf8').trim().split('\n').length - 1,
    formula_rows: readFileSync(join(DATA, 'formulas.tsv'), 'utf8').trim().split('\n').length - 1,
    section_rows: readFileSync(join(DATA, 'sections.tsv'), 'utf8').trim().split('\n').length - 1,
    herb_rows: readFileSync(join(DATA, 'herbs.tsv'), 'utf8').trim().split('\n').length - 1,
    glossary_rows: readFileSync(join(DATA, 'glossary.tsv'), 'utf8').trim().split('\n').length - 1,
    jc_books: readFileSync(join(DATA, 'jc-catalog.tsv'), 'utf8').trim().split('\n').length - 1,
    jc_sources: readFileSync(join(DATA, 'jc-sources.tsv'), 'utf8').trim().split('\n').length - 1,
    hdnj_quote_rows: readFileSync(join(DATA, 'xref-hdnj.tsv'), 'utf8').trim().split('\n').length - 1,
    witnesses: wit.length,
    witnesses_downloaded: wit.filter((l) => l.split('\t')[14] === 'downloaded').length,
    witnesses_extracted: wit.filter((l) => l.split('\t')[14] === 'extracted').length,
  },
  files: hashes,
  track_id_scheme: 'S<條號4>.part / X<段序4>.part；方接所屬條，kind=formula-*',
  note: '階段一（漢文本文＋注疏群）draft。軌號只增不改；canonical 未凍結。',
};

mkdirSync(join(ROOT, 'build', 'rev', rev), { recursive: true });
writeFileSync(join(ROOT, 'build', 'rev', rev, 'rev.json'), JSON.stringify(doc, null, 2) + '\n');
writeFileSync(join(DATA, 'rev.json'), JSON.stringify(doc, null, 2) + '\n');
const revDir = join(ROOT, 'build', 'rev', rev);
for (const f of [...files, 'rev.json']) copyFileSync(join(DATA, f), join(revDir, f));
console.log(JSON.stringify(doc.counts, null, 2));
console.log(`→ build/rev/${rev}/（rev.json ＋ ${files.length} 檔快照）、data/rev.json`);



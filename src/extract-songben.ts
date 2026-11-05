#!/usr/bin/env bun
/**
 * 宋本《傷寒論》→ data/songben.json
 *
 * 來源：中醫笈成《傷寒論（宋本）》index.html（data/sources/songben.html，唯讀）
 *  底本：四部叢刊初編《註解傷寒論》（王叔和編次、林億校正、趙開美校刻）
 *
 *   bun run src/extract-songben.ts
 *
 * 只做結構化：卷／篇／條／方／校注；不改字。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { extractText, stripTags, decodeEntities, sha256, type Note } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'data', 'sources', 'songben.html');
const OUT = join(ROOT, 'data');
mkdirSync(OUT, { recursive: true });

const raw = readFileSync(SRC, 'utf8');

const title = stripTags((raw.match(/<h1>([\s\S]*?)<\/h1>/) ?? [, ''])[1]!);
const provenance = stripTags((raw.match(/<dt>底本<\/dt><dd>([\s\S]*?)<\/dd>/) ?? [, ''])[1]!);

type Block =
  | { type: 'clause'; no: number; text: string; notes: Note[] }
  | { type: 'para'; text: string; notes: Note[] }
  | { type: 'formula'; name: string; lines: { role: string; text: string; notes: Note[] }[] };

type Pian = { no: number; label: string; blocks: Block[] };
type Juan = { no: number; label: string; pian: Pian[] };

// 1. 先抽出 <span class="方">…</span>，換成佔位符，避免內層 <p> 被當成正文段落。
//    方塊內含 <span class="校">…</span>，其 </span> 會讓簡單的 lazy regex 提早收尾；
//    先把內層 span 換成佔位符，抽完再還原。
const innerSpans: string[] = [];
let body = raw.slice(raw.indexOf('<h2>'));
body = body.replace(/<span class="(校|註)">[\s\S]*?<\/span>/g, (m) => {
  innerSpans.push(m);
  return `\u0002S${innerSpans.length - 1}\u0002`;
});
const restoreInner = (s: string) =>
  s.replace(/\u0002S(\d+)\u0002/g, (_, i: string) => innerSpans[+i] ?? '');

const formulas: string[] = [];
body = body.replace(/<span class="方">([\s\S]*?)<\/span>/g, (_, inner: string) => {
  formulas.push(restoreInner(inner));
  return `@@F${formulas.length - 1}@@`;
});
body = restoreInner(body);

function parseFormula(inner: string): Block {
  const ps = [...inner.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => m[1]!);
  let name = '';
  const lines: { role: string; text: string; notes: Note[] }[] = [];

  ps.forEach((p, i) => {
    let html = p;
    const b = html.match(/<b>([\s\S]*?)<\/b>/);
    if (b) {
      name = stripTags(b[1]!);
      html = html.replace(b[0], '');
    }
    const { text, notes } = extractText(html, { keepSep: i <= 1 });
    if (!text) return;
    let role: string;
    const looksMethod = /[。；]/.test(text) &&
      /(以水|煮取|右[一二三四五六七八九十]味|分溫|去滓|內諸藥|服一升|灌穀道|^於.*方內|^更加|^加|^去|^減)/.test(text);
    if (i === 0 && b) role = 'name-tail';
    else if (i <= 1 && !looksMethod) role = 'ingredients';
    else role = 'method';
    let out = text;
    if (role === 'ingredients' && text.includes('\u3000')) {
      const segs = text.split('\u3000').filter(Boolean);
      if (segs.length === notes.length) {
        out = segs.map((seg, k) => `${seg}（${notes[k]!.text}）`).join('\u3000');
      } else {
        out = segs.join('\u3000') + (notes.length ? `（${notes.map((n) => n.text).join('；')}）` : '');
      }
      lines.push({ role, text: out, notes: [] });
      return;
    }
    lines.push({ role, text: out, notes });
  });
  if (!name) name = `方${formulas.length}`;
  return { type: 'formula', name, lines };
}

// 2. 走 h2 / h3 / p / 方佔位符
const tokenRe = /<h2>([\s\S]*?)<\/h2>|<h3>([\s\S]*?)<\/h3>|<p>([\s\S]*?)<\/p>|@@F(\d+)@@/g;

const juanList: Juan[] = [];
const front: Pian[] = [];
let curJuan: Juan | null = null;
let curPian: Pian | null = null;
let pianSeq = 0;
let clauseNo = 0;
const clauseNos: number[] = [];

for (const m of body.matchAll(tokenRe)) {
  const [, h2, h3, p, f] = m;
  if (h2 !== undefined) {
    const label = stripTags(h2);
    if (/^卷/.test(label)) {
      curJuan = { no: juanList.length + 1, label, pian: [] };
      juanList.push(curJuan);
      curPian = null;
    } else {
      curJuan = null;
      curPian = { no: ++pianSeq, label, blocks: [] };
      front.push(curPian);
    }
    continue;
  }
  if (h3 !== undefined) {
    const label = stripTags(h3);
    const pian: Pian = { no: ++pianSeq, label, blocks: [] };
    if (curJuan) curJuan.pian.push(pian);
    else front.push(pian);
    curPian = pian;
    continue;
  }
  if (f !== undefined) {
    if (!curPian) throw new Error(`方塊 ${f} 不屬於任何篇`);
    curPian.blocks.push(parseFormula(formulas[+f]!));
    continue;
  }
  if (p === undefined) continue;
  if (!curPian) continue;

  const noMatch = p.match(/<span class="編號">(\d+)\.<\/span>/);
  if (noMatch) {
    const no = +noMatch[1]!;
    if (no !== clauseNo + 1) {
      console.warn(`條號不連續：期望 ${clauseNo + 1}，得到 ${no}`);
    }
    clauseNo = no;
    clauseNos.push(no);
    const { text, notes } = extractText(p.replace(noMatch[0], ''));
    curPian.blocks.push({ type: 'clause', no, text, notes });
  } else {
    const { text, notes } = extractText(p);
    if (text) curPian.blocks.push({ type: 'para', text, notes });
  }
}

const allPian = [...front, ...juanList.flatMap((j) => j.pian)];
const stats = {
  juan: juanList.length,
  pian: allPian.length,
  front_pian: front.length,
  clauses: clauseNos.length,
  clause_first: clauseNos[0],
  clause_last: clauseNos.at(-1),
  formulas: allPian.flatMap((p) => p.blocks).filter((b) => b.type === 'formula').length,
  paras: allPian.flatMap((p) => p.blocks).filter((b) => b.type === 'para').length,
  chars: allPian.flatMap((p) => p.blocks).reduce((n, b) => {
    if (b.type === 'formula') return n + b.lines.reduce((k, l) => k + l.text.length, 0);
    return n + b.text.length;
  }, 0),
};

const doc = {
  witness: 'SB',
  title,
  provenance,
  source_url:
    'https://gitlab.com/jicheng/jc.data/-/raw/master/pages/book/%E5%82%B7%E5%AF%92%E8%AB%96%EF%BC%88%E5%AE%8B%E6%9C%AC%EF%BC%89/index.html',
  source_sha256: sha256(raw),
  extracted_at: new Date().toISOString(),
  front,
  juan: juanList,
  stats,
};

writeFileSync(join(OUT, 'songben.json'), JSON.stringify(doc, null, 1) + '\n');
console.log(JSON.stringify(stats, null, 2));
console.log('→ data/songben.json');
console.log('front:', front.map((p) => p.label).join(' / '));
console.log('juan:', juanList.map((j) => `${j.label}(${j.pian.length}篇)`).join(' '));


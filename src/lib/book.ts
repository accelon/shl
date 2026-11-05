/**
 * 中醫笈成（jicheng）單書 HTML 的通用解析：標題層 + 段落。
 * 只依賴 <h1|h2|h3> 與 <p>，足以處理 jc.data 的全部書。
 */
import { readFileSync } from 'node:fs';
import { extractText, stripTags, hanOnly } from './text';

export type Para = {
  idx: number;
  id: string;
  path: string[];
  text: string;
  notes: string;
};

export type Book = {
  title: string;
  author: string;
  dynasty: string;
  year: string;
  provenance: string;
  paras: Para[];
};

const VARIANT: [RegExp, string][] = [
  [/説/g, '說'],
  [/爲/g, '為'],
  [/裏/g, '裡'],
  [/痓/g, '痙'],
  [/鞕/g, '硬'],
  [/𠘧/g, '几'],
  [/祗/g, '祇'],
  [/槃/g, '盤'],
  [/蔕/g, '蒂'],
  [/麤/g, '粗'],
  [/脉/g, '脈'],
  [/大陽/g, '太陽'],
  [/大陰/g, '太陰'],
  [/濇/g, '澀'],
  [/欬/g, '咳'],
  [/胷/g, '胸'],
  [/讝/g, '譫'],
  [/痠/g, '酸'],
  [/姜/g, '薑'],
  [/煑/g, '煮'],
  [/衂/g, '衄'],
  [/藴/g, '蘊'],
  [/欝/g, '鬱'],
];

export function normHan(s: string): string {
  let t = hanOnly(s.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, ''));
  for (const [re, to] of VARIANT) t = t.replace(re, to);
  return t;
}

export function parseBook(file: string): Book {
  const raw = readFileSync(file, 'utf8');
  const meta = (tag: string) => {
    const m = raw.match(new RegExp(`<dt>${tag}</dt><dd>([\\s\\S]*?)</dd>`));
    return m ? stripTags(m[1]!) : '';
  };
  const body = raw.slice(Math.max(0, raw.indexOf('</header>') + 9));
  const tokenRe = /<h([1-6])>([\s\S]*?)<\/h\1>|<p(\s[^>]*)?>([\s\S]*?)<\/p>/g;
  const stack: string[] = [];
  const paras: Para[] = [];
  let idx = 0;
  for (const m of body.matchAll(tokenRe)) {
    const [, lv, head, attrs, p] = m;
    if (lv !== undefined) {
      const level = +lv;
      stack.length = Math.max(0, level - 1);
      stack[level - 1] = stripTags(head);
      continue;
    }
    if (p === undefined) continue;
    const { text, notes } = extractText(p);
    if (!text) continue;
    const id = attrs?.match(/\bid="([^"]*)"/)?.[1] ?? '';
    paras.push({
      idx: idx++,
      id,
      path: stack.filter(Boolean).slice(),
      text,
      notes: notes.map((n) => n.text).join('｜'),
    });
  }
  return {
    title: stripTags((raw.match(/<h1>([\s\S]*?)<\/h1>/) ?? [, ''])[1]!),
    author: meta('作者'),
    dynasty: meta('朝代'),
    year: meta('年份'),
    provenance: meta('底本'),
    paras,
  };
}

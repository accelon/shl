/**
 * 古籍文本共用小工具（HTML → 區塊、句讀、正規化、相似度）。
 *
 * 这一层刻意不依赖任何具体书；`hdnj`（黄帝内经）可直接引用或按需搬过去，
 * 不要另写一份。若两边都要改，先决定谁拥有，再同步。
 */

export type Note = { kind: '校' | '註' | '夾注'; text: string };

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&mdash;': '—',
  '&hellip;': '…',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&[a-zA-Z]+;/g, (m) => ENTITIES[m] ?? m);
}

/** 去掉标签；把 <br> 当空白。用于标题等不需要注文的地方。 */
export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ''),
  ).replace(/\s+/g, ' ').trim();
}

/**
 * 抽正文：把雙行小字、校、註抽成 notes，正文只留大字。
 * 回傳 text 已去掉多餘空白（保留中文標點）。
 */
export function extractText(html: string, opts: { keepSep?: boolean } = {}): { text: string; notes: Note[] } {
  const notes: Note[] = [];
  let s = html;

  s = s.replace(
    /<span class="校">\s*<small class="雙行小字">([\s\S]*?)<\/small>\s*<\/span>/g,
    (_, t) => {
      notes.push({ kind: '校', text: stripTags(t) });
      return '';
    },
  );
  s = s.replace(
    /<span class="註">\s*<small class="雙行小字">([\s\S]*?)<\/small>\s*<\/span>/g,
    (_, t) => {
      notes.push({ kind: '註', text: stripTags(t) });
      return '';
    },
  );
  s = s.replace(/<small class="雙行小字">([\s\S]*?)<\/small>/g, (_, t) => {
    notes.push({ kind: '夾注', text: stripTags(t) });
    return '';
  });
  s = s.replace(/<small class="旁注"[^>]*>([\s\S]*?)<\/small>/g, (_, t) => {
    notes.push({ kind: '夾注', text: stripTags(t) });
    return '';
  });

  s = s.replace(/<b>([\s\S]*?)<\/b>/g, (_, t) => stripTags(t));
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s);
  s = s.replace(/[ \t\r\n\u00a0]+/g, '');
  if (!opts.keepSep) s = s.replace(/\u3000+/g, '');
  return { text: s.trim(), notes };
}

/** 句讀：以句末標點切；問曰／答曰／師曰另起。保留標點。 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  // 問答體：在非句首的「問曰：」「答曰：」「師曰：」前斷開
  const marked = text.replace(/(?<=.)(問曰：|答曰：|師曰：)/g, '\u0001$1');
  const parts = marked.split(/(?<=[。！？])/g);
  const out: string[] = [];
  for (const raw of parts) {
    for (const piece of raw.split('\u0001')) {
      const s = piece.trim();
      if (!s) continue;
      if (out.length && s.length <= 2 && !/[。！？]$/.test(s)) {
        out[out.length - 1] += s;
      } else {
        out.push(s);
      }
    }
  }
  // 太短的尾句併回前句（例如單一「。」）
  return out.filter((s) => /[\u4e00-\u9fff]/.test(s));
}

/** 正規化：只留漢字，用於跨版本比對。 */
export function hanOnly(s: string): string {
  return s.replace(/[^\u3400-\u9fff]/g, '');
}

/** 簡易相似度：以 4-gram 覆蓋率（A 的 4-gram 有多少出現在 B）。 */
export function gramCoverage(a: string, b: string, n = 4): number {
  const A = hanOnly(a);
  const B = hanOnly(b);
  if (A.length < n || B.length < n) return 0;
  const set = new Set<string>();
  for (let i = 0; i + n <= B.length; i++) set.add(B.slice(i, i + n));
  let hit = 0;
  let total = 0;
  for (let i = 0; i + n <= A.length; i++) {
    total++;
    if (set.has(A.slice(i, i + n))) hit++;
  }
  return total ? hit / total : 0;
}

export function tsvCell(v: unknown): string {
  return String(v ?? '').replace(/[\t\r\n]+/g, ' ').trim();
}

export function tsv(rows: (unknown[])[]): string {
  return rows.map((r) => r.map(tsvCell).join('\t')).join('\n') + '\n';
}

export function sha256(s: string): string {
  const h = new Bun.CryptoHasher('sha256');
  h.update(s);
  return h.digest('hex');
}

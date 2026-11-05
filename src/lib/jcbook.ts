/**
 * jc.adb XML（abx 匯出）的單書解析：<章>/<節>/<項>/<目>/<條> 為標題，◇ 為段落。
 */
import { readFileSync } from 'node:fs';
import { decodeEntities } from './text';

export type JcPara = { idx: number; path: string[]; text: string };

const LEVEL: Record<string, number> = { 章: 1, 節: 2, 項: 3, 目: 4, 條: 5 };

export function parseJcXml(file: string): JcPara[] {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const stack: string[] = [];
  const paras: JcPara[] = [];
  let cur: string | null = null;

  const flush = () => {
    if (cur === null) return;
    const text = decodeEntities(cur.replace(/<[^>]+>/g, '')).replace(/\s+/g, '').trim();
    if (text) paras.push({ idx: paras.length, path: stack.filter(Boolean), text });
    cur = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^<(章|節|項|目|條)>([\s\S]*?)<\/\1>$/);
    if (h) {
      flush();
      const lv = LEVEL[h[1]!]!;
      stack.length = lv - 1;
      stack[lv - 1] = decodeEntities(h[2]!.replace(/<[^>]+>/g, '')).trim();
      continue;
    }
    if (/^<(書名|作者|朝代|底本|品質)>/.test(line)) { flush(); continue; }
    if (line.startsWith('◇')) {
      flush();
      cur = line.slice(1);
      continue;
    }
    // 非段落的殘餘（年份、空行、圖片）忽略；其餘接續目前段落
    if (cur !== null) cur += line;
  }
  flush();
  return paras;
}

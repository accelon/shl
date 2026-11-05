#!/usr/bin/env bun
/**
 * 週邊文獻清單（機器可讀）。人工維護 metadata；段落數由本地檔即時算。
 *
 *   bun run src/build-witnesses.ts
 *
 * 產出 data/witnesses.tsv
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBook } from './lib/book';
import { tsv } from './lib/text';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'data', 'sources');

type W = {
  id: string; title: string; author: string; era: string; year: string; lang: string;
  type: string; relation: string; derivation: string; scope: string;
  source: string; url: string; file: string; status: string; note: string;
};

const W: W[] = [
  // ---- 本文／別本 ----
  { id: 'SB', title: '傷寒論（宋本）', author: '張機（仲景）撰；王叔和編次；林億等校正', era: '東漢', year: '約200；校正1066', lang: 'zh', type: 'base', relation: 'base', derivation: 'original', scope: '全書10卷22篇', source: '中醫笈成（四部叢刊初編·註解傷寒論）', url: 'https://jicheng.tw/tcm/book/傷寒論（宋本）/index.html', file: 'songben.html', status: 'downloaded', note: '398條編號為電子本所加；底本屬註解傷寒論系統，非趙開美獨立宋本' },
  { id: 'ZJ', title: '註解傷寒論', author: '成無己', era: '金', year: '1144', lang: 'zh', type: 'commentary', relation: 'parallel', derivation: 'commentary', scope: '全書', source: '中醫笈成（四部叢刊初編，嘉靖乙巳刊本）', url: 'https://jicheng.tw/tcm/book/註解傷寒論/index.html', file: 'zhujie.html', status: 'downloaded', note: '第一家全文注；經文＋注文相間' },
  { id: 'KP', title: '古本康平傷寒論', author: '張機；大塚敬節校正', era: '日本', year: '康平三年（1060）寫本', lang: 'zh', type: 'recension', relation: 'parallel', derivation: 'original', scope: '全書', source: '中醫笈成（葉橘泉重校重排本）', url: 'https://jicheng.tw/tcm/book/古本康平傷寒論/index.html', file: 'kangping.html', status: 'downloaded', note: '無成無己注；保留旁注／夾注形態' },
  { id: 'KZ', title: '康治本傷寒論', author: '張機', era: '日本', year: '康治二年（1143）寫本', lang: 'zh', type: 'recension', relation: 'parallel', derivation: 'original', scope: '全書（最簡本）', source: '待找排印本／掃描本', url: '', file: '', status: 'todo', note: '僅 50 餘方、無傷寒例；未有可靠全文，暫不建軌' },
  { id: 'GL', title: '傷寒雜病論（桂林古本）', author: '張機', era: '東漢（自稱）', year: '1930s 傳出；1980 刊', lang: 'zh', type: 'recension', relation: 'parallel', derivation: 'original', scope: '全書16卷', source: '中醫笈成（廣西人民出版社1980版）', url: 'https://jicheng.tw/tcm/book/傷寒雜病論（桂林古本）/index.html', file: 'guilin.html', status: 'downloaded', note: '編次與宋本差異大；含六氣、溫病等' },
  { id: 'YH', title: '金匱玉函經', author: '張機', era: '漢（傳）', year: '清康熙刻本', lang: 'zh', type: 'recension', relation: 'parallel', derivation: 'original', scope: '全書', source: '中醫笈成（清康熙刻本）', url: 'https://jicheng.tw/tcm/book/金匱玉函經/index.html', file: 'yuhan.html', status: 'downloaded', note: '與宋本同源異流；可作早期傳本證據' },

  // ---- 宋以前傳本層 ----
  { id: 'MJ', title: '脈經', author: '王叔和', era: '西晉', year: '約280', lang: 'zh', type: 'recension', relation: 'parallel', derivation: 'original', scope: '卷七至卷九（傷寒／汗吐下）', source: '中醫笈成（影鈔宋嘉定刊小字本）', url: 'https://jicheng.tw/tcm/book/脈經/index.html', file: 'maijing.html', status: 'downloaded', note: '最早可考的仲景遺論編次；卷七傷寒例／辨脈，卷八汗吐下，卷九可不可' },
  { id: 'QY', title: '千金翼方', author: '孫思邈', era: '唐', year: '682', lang: 'zh', type: 'recension', relation: 'parallel', derivation: 'original', scope: '卷九、卷十（傷寒論）', source: '中醫笈成（清同治掃葉山房本）', url: 'https://jicheng.tw/tcm/book/千金翼方/index.html', file: 'qianjin.html', status: 'downloaded', note: '唐初所見傷寒論面貌；方證次序與宋本不同' },
  { id: 'WT', title: '外臺秘要', author: '王燾', era: '唐', year: '752', lang: 'zh', type: 'recension', relation: 'parallel', derivation: 'original', scope: '卷一、卷二（傷寒）', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/外臺秘要/index.html', file: '外臺秘要.html', status: 'downloaded', note: '引崔氏、千金、仲景諸家；可補唐本異文' },
  { id: 'SHF', title: '太平聖惠方', author: '王懷隱、陳昭遇等', era: '北宋', year: '992', lang: 'zh', type: 'recension', relation: 'parallel', derivation: 'original', scope: '卷八至卷十（傷寒）', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/太平聖惠方/index.html', file: '太平聖惠方.html', status: 'downloaded', note: '淳化本系統；宋初官修，早於林億校正' },

  // ---- 宋金元注家 ----
  { id: 'ML', title: '傷寒明理論', author: '成無己', era: '金', year: '1142', lang: 'zh', type: 'treatise', relation: 'dependent', derivation: 'commentary', scope: '五十證＋方論', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒明理論/index.html', file: '傷寒明理論.html', status: 'downloaded', note: '按證／方立論，非逐條；適合做術語與證候索引' },
  { id: 'ZB', title: '傷寒總病論', author: '龐安時（安石）', era: '北宋', year: '1084', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒總病論/index.html', file: '傷寒總病論.html', status: 'downloaded', note: '北宋傷寒學；含溫病、天行、暑病' },
  { id: 'HR', title: '類證活人書', author: '朱肱', era: '北宋', year: '1118', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/類證活人書/index.html', file: '類證活人書.html', status: 'downloaded', note: '按證類編，影響宋元傷寒學' },
  { id: 'BZG', title: '傷寒百證歌', author: '許叔微', era: '南宋', year: '1130年代', lang: 'zh', type: 'treatise', relation: 'dependent', derivation: 'commentary', scope: '百證歌訣', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒百證歌/index.html', file: '傷寒百證歌.html', status: 'downloaded', note: '歌訣體，非逐條注；可作證候索引' },
  { id: 'SJL', title: '傷寒九十論', author: '許叔微', era: '南宋', year: '1132', lang: 'zh', type: 'treatise', relation: 'dependent', derivation: 'commentary', scope: '九十論', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒九十論/index.html', file: '傷寒九十論.html', status: 'downloaded', note: '醫論／醫案體' },
  { id: 'WZ', title: '傷寒微旨論', author: '韓祗和', era: '北宋', year: '1086?', lang: 'zh', type: 'treatise', relation: 'dependent', derivation: 'commentary', scope: '二卷', source: '四庫全書子部·醫家類（skqs → data/sources/skqs-wz.txt）', url: 'https://jicheng.tw/tcm/book/傷寒微旨論/index.html', file: 'skqs-wz.txt', status: 'downloaded', note: '四庫本；jicheng／jc.adb 皆空殼，此為目前唯一全文' },
  { id: 'ZG', title: '傷寒直格', author: '劉完素', era: '金', year: '1186?', lang: 'zh', type: 'treatise', relation: 'dependent', derivation: 'commentary', scope: '三卷', source: 'jc.adb → out/jc-books/傷寒直格.xml', url: 'https://jicheng.tw/tcm/book/傷寒直格/index.html', file: '', status: 'extracted', note: '火熱論；與成無己相對照；已由 jc.adb 抽出' },
  { id: 'BW', title: '仲景傷寒補亡論', author: '郭雍', era: '南宋', year: '1181?', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '二十卷', source: 'jc.adb → out/jc-books/仲景傷寒補亡論.xml', url: 'https://jicheng.tw/tcm/book/仲景傷寒補亡論/index.html', file: '', status: 'extracted', note: '補亡體；已由 jc.adb 抽出' },

  // ---- 明清注家 ----
  { id: 'TB', title: '傷寒論條辨', author: '方有執', era: '明', year: '1592', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書（重編）', source: '中醫笈成（四庫文淵閣本）', url: 'https://jicheng.tw/tcm/book/傷寒論條辨/index.html', file: '傷寒論條辨.html', status: 'downloaded', note: '削傷寒例、重編條次；開清代錯簡重訂之風' },
  { id: 'SL', title: '尚論篇', author: '喻昌', era: '清', year: '1648', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書（重編）', source: '中醫笈成（四庫文淵閣本）', url: 'https://jicheng.tw/tcm/book/尚論篇/index.html', file: '尚論篇.html', status: 'downloaded', note: '錯簡論；按法重編' },
  { id: 'LSZ', title: '傷寒論註來蘇集', author: '柯琴', era: '清', year: '1669', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '傷寒論註', source: '中醫笈成（早稻田大學掃描本）', url: 'https://jicheng.tw/tcm/book/傷寒論註來蘇集/index.html', file: '傷寒論註來蘇集.html', status: 'downloaded', note: '以方類證、六經地面說' },
  { id: 'LSJ', title: '傷寒來蘇集', author: '柯琴', era: '清', year: '1669', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '含翼／附翼', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒來蘇集/index.html', file: '傷寒來蘇集.html', status: 'downloaded', note: '與 LS 互補；含《傷寒論翼》' },
  { id: 'LSY', title: '傷寒論翼', author: '柯琴', era: '清', year: '1669?', lang: 'zh', type: 'treatise', relation: 'dependent', derivation: 'commentary', scope: '二卷', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒論翼/index.html', file: '傷寒論翼.html', status: 'downloaded', note: '六經地面、合病併病等通論' },
  { id: 'LSF', title: '傷寒附翼', author: '柯琴', era: '清', year: '1669?', lang: 'zh', type: 'treatise', relation: 'dependent', derivation: 'commentary', scope: '方論', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒附翼/index.html', file: '傷寒附翼.html', status: 'downloaded', note: '方論' },
  { id: 'GZ', title: '傷寒貫珠集', author: '尤怡', era: '清', year: '1729', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書（按法編）', source: '中醫笈成（北京大學掃描本）', url: 'https://jicheng.tw/tcm/book/傷寒貫珠集/index.html', file: '傷寒貫珠集.html', status: 'downloaded', note: '正治／權變／斡旋／救逆／類病諸法' },
  { id: 'QZ', title: '傷寒論淺註補正', author: '陳念祖（修園）注；唐宗海（容川）補正', era: '清', year: '1803／1894', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '中醫笈成（北京大學掃描本）', url: 'https://jicheng.tw/tcm/book/傷寒論淺註補正/index.html', file: '傷寒論淺註補正.html', status: 'downloaded', note: '普及本；補正加入唐氏按語' },
  { id: 'LF', title: '傷寒論類方', author: '徐大椿（靈胎）', era: '清', year: '1759', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '按方類編', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒論類方/index.html', file: '傷寒論類方.html', status: 'downloaded', note: '方類；每方下繫條文' },
  { id: 'SYJ', title: '傷寒溯源集', author: '錢潢', era: '清', year: '1707', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒溯源集/index.html', file: '傷寒溯源集.html', status: 'downloaded', note: '考據／溯源' },
  { id: 'BZ', title: '傷寒論辯證廣註', author: '汪琥', era: '清', year: '1680', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒論辯證廣註/index.html', file: '傷寒論辯證廣註.html', status: 'downloaded', note: '集注體；辨證為主' },
  { id: 'XJ', title: '傷寒懸解', author: '黃元御', era: '清', year: '1748', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書（重編）', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒懸解/index.html', file: '傷寒懸解.html', status: 'downloaded', note: '氣化／六經；重編' },
  { id: 'GM', title: '傷寒論綱目', author: '沈金鰲', era: '清', year: '1774', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書（按證類編）', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒論綱目/index.html', file: '傷寒論綱目.html', status: 'downloaded', note: '按證類編，非原次' },
  { id: 'YJ', title: '醫宗金鑑·訂正仲景全書傷寒論註', author: '吳謙等', era: '清', year: '1742', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '中醫笈成（醫宗金鑑）', url: 'https://jicheng.tw/tcm/book/醫宗金鑑/訂正仲景全書傷寒論註/index.html', file: '醫宗金鑑·傷寒論註.html', status: 'downloaded', note: '官修；清代科舉讀本' },
  { id: 'ZZ', title: '張卿子傷寒論', author: '張遂辰（卿子）參', era: '清', year: '1644', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/張卿子傷寒論/index.html', file: '張卿子傷寒論.html', status: 'downloaded', note: '成無己注＋張氏參評' },
  { id: 'HZ', title: '傷寒論彙註精華', author: '（輯者待考）', era: '清', year: '清', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/傷寒論彙註精華/index.html', file: '傷寒論彙註精華.html', status: 'downloaded', note: '彙註；作者待考' },
  { id: 'HDB', title: '傷寒論後條辨', author: '程應旄', era: '清', year: '1670?', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '待找', url: '', file: '', status: 'todo', note: '重編條辨；中醫笈成未收' },
  { id: 'ZJZ', title: '傷寒論直解', author: '張錫駒', era: '清', year: '1712?', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '待找', url: '', file: '', status: 'todo', note: '待找' },
  { id: 'SZ', title: '傷寒論三注', author: '周揚俊', era: '清', year: '1670?', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '待找', url: '', file: '', status: 'todo', note: '喻昌／方有執／柯琴三家合注' },

  // ---- 日本江戶 ----
  { id: 'JY', title: '傷寒論輯義', author: '丹波元簡', era: '日本', year: '1801', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書（集注）', source: '中醫笈成（皇漢醫學叢書）', url: 'https://jicheng.tw/tcm/book/傷寒論輯義/index.html', file: '傷寒論輯義.html', status: 'downloaded', note: '集注＋考據；引用數十家' },
  { id: 'SY', title: '傷寒論述義', author: '丹波元堅', era: '日本', year: '1827', lang: 'zh', type: 'treatise', relation: 'dependent', derivation: 'commentary', scope: '通論', source: '中醫笈成（皇漢醫學叢書）', url: 'https://jicheng.tw/tcm/book/傷寒論述義/index.html', file: '傷寒論述義.html', status: 'downloaded', note: '通論體，非逐條' },
  { id: 'JC', title: '傷寒論集成', author: '山田正珍', era: '日本', year: '1789', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '中醫笈成（皇漢醫學叢書）', url: 'https://jicheng.tw/tcm/book/傷寒論集成/index.html', file: '傷寒論集成.html', status: 'downloaded', note: '考據派；刪偽／校勘' },
  { id: 'KGI', title: '傷寒論疏義', author: '喜多村直寬', era: '日本', year: '1840s', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: '待找', url: '', file: '', status: 'todo', note: '待找' },

  // ---- 近代／現代 ----
  { id: 'CYF', title: '曹氏傷寒金匱發微合刊', author: '曹穎甫', era: '近代', year: '1930s', lang: 'zh', type: 'commentary', relation: 'dependent', derivation: 'commentary', scope: '全書', source: 'jc.adb → out/jc-books/曹氏傷寒金匱發微合刊.xml', url: 'https://jicheng.tw/tcm/book/曹氏傷寒金匱發微合刊/index.html', file: '', status: 'extracted', note: '近代經方派；已由 jc.adb 抽出' },
  { id: 'HH', title: '皇漢醫學', author: '湯本求真', era: '日本', year: '1927', lang: 'zh', type: 'treatise', relation: 'dependent', derivation: 'commentary', scope: '方證／醫案', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/皇漢醫學/index.html', file: '', status: 'todo', note: '古方派；可作方證索引' },

  // ---- 參照（不由 shl 建全文軌） ----
  { id: 'SW', title: '黃帝內經素問', author: '（傳）黃帝', era: '先秦—漢', year: '—', lang: 'zh', type: 'reference', relation: 'reference', derivation: 'reference', scope: '全書', source: 'hdnj（data/tracks/zh-suwen.tsv）', url: '', file: '', status: 'external', note: '張仲景序所引；軌號 SW01-001.1 由 hdnj 建，shl 只引用' },
  { id: 'LS', title: '靈樞（九卷）', author: '（傳）黃帝', era: '先秦—漢', year: '—', lang: 'zh', type: 'reference', relation: 'reference', derivation: 'reference', scope: '全書', source: 'hdnj（data/tracks/zh-lingshu.tsv）', url: '', file: '', status: 'external', note: '序稱《九卷》；軌號 LS01-001.1 由 hdnj 建' },
  { id: 'NJ', title: '八十一難經', author: '（傳）扁鵲', era: '漢', year: '—', lang: 'zh', type: 'reference', relation: 'reference', derivation: 'reference', scope: '全書', source: 'hdnj（data/works.tsv NJ；待切軌）', url: '', file: '', status: 'external', note: '序所引；hdnj 已登記 NJ，尚未切軌' },
  { id: 'BC', title: '神農本草經', author: '（傳）神農', era: '漢', year: '—', lang: 'zh', type: 'reference', relation: 'reference', derivation: 'reference', scope: '藥物', source: '中醫笈成', url: 'https://jicheng.tw/tcm/book/神農本草經/index.html', file: '', status: 'todo', note: '方藥劑量／藥性；可建「方→藥」索引，不建全文軌' },
];

const rows: (string | number)[][] = [[
  'witness_id', 'title', 'author', 'era', 'year', 'lang', 'type', 'relation', 'derivation',
  'scope', 'source', 'url', 'local_file', 'paragraphs', 'status', 'note',
]];

for (const w of W) {
  let paras = 0;
  if (w.file && existsSync(join(SRC, w.file))) {
    try { paras = parseBook(join(SRC, w.file)).paras.length; } catch { paras = 0; }
  }
  rows.push([
    w.id, w.title, w.author, w.era, w.year, w.lang, w.type, w.relation, w.derivation,
    w.scope, w.source, w.url, w.file, paras || '', w.status, w.note,
  ]);
}

writeFileSync(join(ROOT, 'data', 'witnesses.tsv'), tsv(rows));
const downloaded = W.filter((w) => w.status === 'downloaded').length;
console.log(`witnesses ${W.length}; downloaded ${downloaded}; todo ${W.filter((w) => w.status === 'todo').length}`);
console.log('→ data/witnesses.tsv');

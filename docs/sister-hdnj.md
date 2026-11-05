# 與 `hdnj`（黃帝內經）的分工

> 2026-11-05。分工的 canonical 在 `D:\2026\hdnj\docs\division-with-shl.md`；
> 本檔只記 `shl` 端的細節與進度，不重複 canonical 的全文。

## 1. 邊界

| 項目 | `shl` | `hdnj` |
|---|---|---|
| 本文 | 傷寒論（宋本 398 條＋周邊篇） | 素問、靈樞 |
| 別本 | 康平、康治、桂林、金匱玉函 | 全元起輯佚、太素、甲乙經 |
| 注疏 | 成無己以下傷寒注家 | 王冰、馬蒔、吳崑、張志聰等內經注家 |
| 參照 | 素問／靈樞／難經 → 用 `hdnj` 軌號 | 傷寒論 → 用 `shl` 軌號 |

**一句話**：`shl` 不重收內經全文與內經注家；`hdnj` 不重收傷寒論。需要對方文本時只寫 `xref`。

## 2. 進度

| 區 | 產出 | 量 |
|---|---|---|
| `hdnj` | `data/tracks/zh-suwen.tsv`、`zh-lingshu.tsv` | 9,554 軌（素問 6,329／靈樞 3,225） |
| `hdnj` | 隨文注 xref `data/xref/sw-inline.tsv` | 素問 6,279 條 |
| `shl` | `data/tracks-zh.tsv` | 1,757 軌 |
| `shl` | `data/xref.tsv` | 24 家、7,978 列 |
| `shl` | `data/xref-hdnj.tsv` | 注引內經 pilot 2 條 |

## 3. 軌號語法

| 區 | 語法 | 例 |
|---|---|---|
| `hdnj` | `<work><篇:02d>-<段:03d>.<part>` | `SW01-001.1` |
| `shl` | `S<條:04d>.<part>`／`X<段:04d>.<part>` | `S0012.1`、`X0007.2` |

跨區引用要寫 `shl:S0012.1`、`hdnj:SW01-001.1`，不要只寫裸號。

## 4. Namespace 對照

`hdnj` 在 `data/works.tsv` 登記約 44 個 work id。已處理的碰撞：

| ID | `hdnj` | `shl` | 處理 |
|---|---|---|---|
| `LS` | 靈樞 | 靈樞（九卷） | 同名同書，可用 |
| `QY` | 千金翼方 | 千金翼方 | 同名同書 |
| `MJ` | 脈經 | 脈經 | 同名同書 |
| `WT` | 外臺秘要 | 外臺秘要 | 同名同書 |
| `SW` | 素問 | — | hdnj 專用 |
| `TS` | 太素 | — | hdnj 專用 |
| `JJ` | 針灸甲乙經 | —（醫宗金鑑已改 `YJ`） | hdnj 專用 |
| `NJ` | 八十一難經 | — | hdnj 專用 |
| `SB` | — | 傷寒論（宋本） | shl 專用 |
| `ZJ` | — | 註解傷寒論 | shl 專用 |
| `LSZ` | — | 傷寒論註來蘇集 | shl 專用 |
| `YJ` | — | 醫宗金鑑·傷寒論註 | shl 專用 |

`src/check-namespaces.ts` 會比對兩邊；目前 `namespace OK`。

## 5. 共用程式

目前各自實作：`shl` 用 TypeScript（`src/lib/book.ts`、`src/lib/jcbook.ts`），
`hdnj` 用 Python（`parse_jicheng.py`、`build_tracks.py`）。不互相 import，避免耦合。
若日後要合流，由作者決定提升到 `agent-norms`；現在只對照方法，不复制。

## 6. 不重複勞動

| 工作 | 誰做 |
|---|---|
| 內經全文、內經注家、太素、甲乙經、難經 | `hdnj` |
| 傷寒論全文、別本、傷寒注家 | `shl` |
| 脈經／千金翼／外臺 | 各自收自己需要的卷 |
| 中醫術語表 | 尚未決定，不要在兩區各寫一份 |
| 閱讀器、單檔打包 | `zhu-combined` |

## 7. 介面：傷寒論引內經

`data/xref-hdnj.tsv` 目前只有 2 條高覆蓋率引文（成無己引《素問·熱論》《天元紀大論》）；
其餘「經曰」多為意引，覆蓋率不足，暫不寫入。引用時 source 端用 `hdnj` 軌號，`shl` 不自己編內經句號。

## 8. 待作者決定

1. `src/lib/` 是否提升到 `agent-norms`？
2. 中醫術語表由哪一區主編？
3. 內經與傷寒論的互文要不要做雙向 xref？

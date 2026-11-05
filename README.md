# 傷寒論選注（`shl`）

> 2026-11-05 開區；同日完成**階段一 draft**：本文結構化、軌號、注疏 crosswalk。
> prototype 已上孵化器：條級 `/incubator/shl.html`（醫家、孵化中）；句級 pilot 檔案保留，暫不列入；清單以 `deploy/incubator.json` 交付。

## 這是什麼

《傷寒論》的對讀站：主文＋選注（＋可選別本／英譯），形態照
`D:\2026\surangama`（楞嚴經選注）與 `D:\2026\vcpp`（金剛經合注）：

- 開發版：`index.html`，`file://` 可開
- 部署版：單檔 HTML（CSS／JS／資料內嵌，gzip＋base64）

prototype 檔名 `shl.html`（條級）與 `shl-sentence.html`（句級 pilot），位置 `/incubator/`；
正式站名與位置未定。

方法論：`D:\2026\agent-norms\shutonggui.md`（書同軌）。本區編法見
[`docs/track-scheme.md`](docs/track-scheme.md)。

## 來源（原始檔唯讀，放 `data/sources/`，不進版控）

| 類別 | 候選 | 狀態 |
|---|---|---|
| 經文 | 宋本《傷寒論》（趙開美翻刻）、成無己本所附本文、桂林古本 | **重要底本全收** |
| 注疏 | 成無己《注解傷寒論》、方有執《條辨》、喻昌《尚論篇》、柯琴《來蘇集》、尤怡《貫珠集》、張志聰《集注》、陳修園《淺注》 | 重要者全收，其餘盡量收 |
| 別本 | 康平本、康治本 | 已收康平、桂林、金匱玉函；康治本待找 |
| 英譯 | Wiseman、Mitchell 等 | 階段二 |

收錄原則：**重要底本全收，其餘盡量收**；收了什麼、缺什麼，記在 `docs/witnesses.md`
（47 筆，已下載 34 筆）。

## 工作順序

1. **階段一**：漢文本文（底本全收）＋重要注疏群，建句級地址與 crosswalk。
2. **階段二**：加英譯／藏譯／梵文等，只加軌號與對齊，驗證軌號適用性；不先做多語。

## 目前做到哪裡

| 項目 | 數量 | 檔案 |
|---|---:|---|
| 卷／篇 | 10 卷＋卷首；22 篇＋卷首 2 篇 | `data/songben.json` |
| 條 | 398（宋本條號） | 同上 |
| 方 | 141 方塊（120 個方名） | 同上 |
| 軌號 | 1,757 | `data/tracks-zh.tsv` |
| cuts | 1,756（條界 388、篇界 23、段界 209、句讀 1,136） | `data/cuts.tsv` |
| hierarchy | 657 節點（書／卷／篇／條段） | `data/hierarchy.json` |
| 注疏 xref | 24 家、7,978 列（含 4 種早期傳本節錄） | `data/xref.tsv` |
| 句級 xref pilot | 78,283 列（quote 11,018／interp 67,265） | `data/xref-sentence.tsv` |
| 別本 realization | 1,471 軌（KP／GL／YH／MJ／QY／WT／SHF） | `data/tracks-witness.tsv` |
| 別本 align | 1,132 列 | `data/align.tsv` |
| 人工校對樣本 | 48 列（xref）＋19 列（cuts） | `data/xref-review.tsv`、`data/cut-review.tsv` |
| 別本異文 pilot | 543 列 | `data/variants.tsv` |
| 辭典 | 429 條已完成，但 2026-11-05 暫緩上線（UI 待整理） | `out/proto/zhu-data.js` |
| 條／方劑／篇／藥味索引 | 398／141／24／87 | `data/clauses.tsv`、`data/formulas.tsv`、`data/sections.tsv`、`data/herbs.tsv` |
| 週邊文獻 | 47 筆（34 已下載／3 jc.adb／7 待補／3 external） | `data/witnesses.tsv` |
| jc.adb 掃描 | 1,359 書目；146 本相關；97 本新見 | `data/jc-catalog.tsv`、`data/jc-sources.tsv` |
| 四庫醫家類 | 103 部、2,243 卷；補傷寒微旨論 5 卷 | `data/skqs-med.tsv`、`data/sources/skqs-wz.txt` |
| 孵化器 | 條級／句級 pilot 已上線 | `/incubator/shl.html`、`/incubator/shl-sentence.html` |
| draft rev | `2026-11-05-e` | `data/rev.json` |

## 指令（Bun）

```bash
bun run src/extract-songben.ts     # HTML → data/songben.json
bun run src/build-tracks.ts        # → tracks-zh.tsv / cuts.tsv / hierarchy.json
bun run src/build-witnesses.ts     # → witnesses.tsv
bun run src/build-xref.ts          # → xref.tsv / xref-summary.json
bun run src/build-xref-sentence.ts # → xref-sentence.tsv（句級 pilot）
bun run src/build-zhu-data.ts      # → out/proto/zhu-data.js（句級＋辭典）
bun run src/build-zhu-data.ts --clause # → out/proto-clause（條級＋辭典）
bun run src/build-align.ts         # → align.tsv（別本 KP／GL／YH）
bun run src/build-witness-tracks.ts # → tracks-witness.tsv（別本 realization）
bun run src/sample-xref.ts         # → xref-review.tsv（人工校對樣本）
bun run src/build-variants.ts       # → variants.tsv（別本異文 pilot）
bun run src/build-indices.ts        # → clauses / formulas / sections / herbs.tsv
bun run src/build-xref-hdnj.ts     # → xref-hdnj.tsv（注引內經 pilot，讀 hdnj）
bun run src/scan-jc.ts --extract    # 掃 jc.adb 的 XML、抽傷寒相關書
bun run src/scan-skqs.ts           # 掃四庫子部醫家類、抽傷寒微旨論
bun run src/annotate-cuts.ts       # 用 xref 回填 cuts 的支持家數
bun run src/audit-xref.ts          # → xref-audit.json（錨點審計）
bun run src/validate.ts            # 驗證（必須 OK）
bun run src/build-rev.ts           # → data/rev.json、build/rev/<rev>/rev.json
```

**順序很重要**：`build-tracks` 會重寫 `cuts.tsv`（support 歸 1），所以
`annotate-cuts` 必須在 `build-tracks` 與 `build-xref` 之後跑。

探索用（不進 pipeline）：`src/probe-align.ts`、`src/probe-align2.ts`。

## 軌號

```text
S0012.1   宋本第 12 條第 1 句
X0007.2   非 398 條段落的第 2 句
S0012.4   第 12 條桂枝湯的藥味（kind=formula-ingredients）
```

- **軌號不可變、不重用**；`display_sid` 才是可變的顯示號。
- 注疏只存 `xref`（來源段落 ↔ 軌號 range），不各存座標。
- 別本與其他語種（階段二）只加 `tracks`／`align`，不改漢文軌。

## 目錄

```text
AGENTS.md     規則入口（這一區的差異）
README.md     本檔
src/          取源、分句、軌號、xref、驗證
src/lib/      HTML 解析、句讀、正規化（hdnj 可參考，暫不複製）
data/         原始檔（唯讀，不進版控）＋ 衍生資料（進版控）
out/          中間產物（不進版控）
build/        rev 快照（不進版控）
docs/         文獻清單、軌號方案、xref 筆記、決策、建置紀錄
```

## 文件

| 檔案 | 內容 |
|---|---|
| [`docs/witnesses.md`](docs/witnesses.md) | 底本收錄原則、版本譜系、週邊文獻清單 |
| [`docs/stage1-summary.md`](docs/stage1-summary.md) | 階段一摘要（給作者的短版） |
| [`docs/track-scheme.md`](docs/track-scheme.md) | 軌號格式、不可變規則、已知限制 |
| [`docs/xref-notes.md`](docs/xref-notes.md) | 注疏對位方法、覆蓋率、待校問題 |
| [`docs/division-with-hdnj.md`](docs/division-with-hdnj.md) | 分工 canonical 的短註記 |
| [`docs/sister-hdnj.md`](docs/sister-hdnj.md) | 與 `hdnj` 的細節與進度 |
| [`docs/review-checklist.md`](docs/review-checklist.md) | 人工校對順序與記錄方式 |
| [`docs/variants.md`](docs/variants.md) | 別本異文表的方法與限制 |
| [`docs/indices.md`](docs/indices.md) | 條／方劑／篇／藥味索引的欄位與限制 |
| [`docs/glossary.md`](docs/glossary.md) | 術語表 pilot 的範圍與限制 |
| [`docs/dictionary.md`](docs/dictionary.md) | 辭典頁籤與 1–398 條號選取 |
| [`docs/jc-adb.md`](docs/jc-adb.md) | 用 `jc.adb` 掃描、抽書與補缺本 |
| [`docs/prototype-readiness.md`](docs/prototype-readiness.md) | 用 zhu-combined 做 prototype 的 readiness |
| [`docs/skqs.md`](docs/skqs.md) | 四庫子部醫家類掃描與傷寒微旨論 |
| [`docs/ctext.md`](docs/ctext.md) | ctext.org 可用性評估 |
| [`docs/decisions.md`](docs/decisions.md) | 決策紀錄 |
| [`docs/build-log.md`](docs/build-log.md) | 建置紀錄 |

## 限制

- 原始語料唯讀，不改來源；`data/sources/` 不進版控。
- 共用程式在 `D:\2026\zhu-combined`，不在本區另寫一份。
- `rev-2026-11-05-e` 是 draft；人工校對前不要當 canonical。
- 注疏 xref 是自動對位，`confidence=C` 的列要人工校；不要直接上線。
- prototype 已按指示發布；未經作者指示不覆寫線上、不改正式站。

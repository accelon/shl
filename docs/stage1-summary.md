# 階段一摘要（2026-11-05）

> 給作者看的短版：做了什麼、證明什麼、還有什麼不確定。
> 細節在 `docs/witnesses.md`、`docs/track-scheme.md`、`docs/xref-notes.md`。

## 1. 做了什麼

以宋本《傷寒論》為 base，建立一套句級地址，並把重要週邊文獻接上去：

| 項目 | 量 | 檔案 |
|---|---:|---|
| 卷／篇 | 10 卷＋卷首；22 篇＋卷首 2 篇 | `data/songben.json` |
| 條 | 398（宋本條號） | 同上 |
| 方 | 141 方塊（120 方名） | 同上 |
| 軌號 | 1,757 | `data/tracks-zh.tsv` |
| cuts | 1,756（條界 388，support 5–23） | `data/cuts.tsv` |
| hierarchy | 657 節點 | `data/hierarchy.json` |
| 注疏／別本 xref | 24 家、7,978 列（gap 615） | `data/xref.tsv` |
| 句級 xref pilot | 78,283 列（quote 11,018） | `data/xref-sentence.tsv` |
| 別本 realization | 1,471 軌 | `data/tracks-witness.tsv` |
| 別本 align | 1,132 列 | `data/align.tsv` |
| 異文 pilot | 543 列 | `data/variants.tsv` |
| 週邊文獻 | 47 筆（34 已下載／3 jc.adb／7 待補／3 external） | `data/witnesses.tsv` |
| jc.adb 掃描 | 1,359 書目；146 本相關；97 本新見 | `data/jc-catalog.tsv`、`data/jc-sources.tsv` |
| 四庫醫家類 | 103 部／2,243 卷；補傷寒微旨論 | `data/skqs-med.tsv` |
| 孵化器 prototype | 條級 1.9 MB；句級 2.2 MB | `/incubator/shl.html`、`/incubator/shl-sentence.html` |

## 2. 證明了什麼

1. **一套軌號可同時掛本文、注疏、別本**：同一條的宋本句、成無己注、康平本、桂林本都指向同一組 `track_id`。
2. **注疏對位可自動到 95%+**：20 家全文注本中，12 家 ≥93%；成無己 98.2%、淺註 100%、集成 98.7%、
   補亡論 95.7%、曹氏 98.0%。錨點審計 A 級幾乎 100%。
3. **異文可直接抽**：KP／GL／YH 的 1:1 條文，正規化後做字級 diff，得到 543 個實質差異片段。
4. **jc.adb 比逐本抓 HTML 快**：337.5 MiB / 1,359 書，2.7 秒匯出 XML；抽 146 本相關書，
   97 本原本不在清單；補亡論、曹氏已可直接 xref。
5. **跨區可接**：成無己引《素問·熱論》《天元紀大論》2 條，已對到 `hdnj` 的 `SW31-007.1`、`SW66-011.8`。

## 3. 還不確定的

- **base 不是真宋本**：底本是四部叢刊《註解傷寒論》；398 條號是電子本所加，字句要再對校。
- **xref 是自動候選**：C 級要人工校；`data/xref-review.tsv` 已抽 48 列。
- **句級細對還沒做**：目前是「注疏段落 → 條」，不是「注疏句 → 句」。
- **早期傳本只到條級**：脈經、千金翼、外臺、聖惠方對位率 5.5%–62.3%，低是正常的。
- **康治本、張志聰《傷寒論集註》仍缺**：jc.adb 也沒有；微旨論兩邊都只有空殼。
- **異文表只做 1:1**：1:n、n:1、標點異文未做。

## 4. 給作者的三個決定

1. **上線注疏**：建議 8 家 —— 成無己、方有執、喻昌、柯琴、尤怡、陳修園、丹波元簡、山田正珍。
   要不要再加張卿子、補亡論、曹氏？
2. **別本對照**：康平、桂林、金匱玉函已可對；康治本要等全文，還是先不上？
3. **句級細對的優先序**：先做 8 家上線注疏，還是先做早期傳本的卷篇層？

## 5. 檔案導覽

```text
data/
  songben.json          宋本結構化
  tracks-zh.tsv         軌號（主文）
  tracks-witness.tsv    別本 realization
  cuts.tsv              逐刀證據
  cut-review.tsv        待校的 19 刀
  hierarchy.json        書→卷→篇→條段
  xref.tsv              注疏／別本 → 軌號
  xref-review.tsv       待校的 48 列
  xref-audit.json       錨點審計
  xref-hdnj.tsv         注引內經 pilot
  align.tsv             宋本 ↔ 別本
  variants.tsv          別本異文 pilot
  clauses.tsv           條索引
  formulas.tsv          方劑索引
  sections.tsv          篇索引
  herbs.tsv             藥味索引
  glossary.tsv          術語 pilot
  jc-catalog.tsv        jc.adb 全部書目
  jc-sources.tsv        jc.adb 傷寒相關書
  witnesses.tsv         47 筆週邊文獻
  rev.json              draft 版本與 hash
```

## 6. 一句話

**軌號已立，注疏已掛，別本已對，jc.adb 已掃；下一步是人工校對與句級細對。**

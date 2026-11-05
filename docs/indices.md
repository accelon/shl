# 索引表（條／方劑／篇／藥味）

> 2026-11-05。`src/build-indices.ts`；資料 `data/clauses.tsv`、`data/formulas.tsv`、`data/sections.tsv`、`data/herbs.tsv`。
> 這些是「由軌號派生」的查詢表，不另存一套座標。

## 0. `clauses.tsv`（398 列）

| 欄 | 說明 |
|---|---|
| `clause_no` | 宋本條號 |
| `juan` / `pian` | 卷、篇 |
| `track_start` / `track_end` | 條文句軌範圍（不含方軌） |
| `sentences` | 句數 |
| `formulas` | 所屬方名（可能多個） |
| `text` | 條文全文 |

## 1. `sections.tsv`（24 列）

| 欄 | 說明 |
|---|---|
| `juan` / `pian` | 卷、篇 |
| `track_start` / `track_end` | 該篇的軌號範圍 |
| `clause_first` / `clause_last` | 宋本條號範圍（非條文篇為空） |
| `clauses` | 條數 |
| `formulas` | 不同方名數 |
| `chars` | 該篇軌文字數 |

用途：目錄、麵包屑、篇內統計。

## 2. `formulas.tsv`（141 列）

| 欄 | 說明 |
|---|---|
| `formula` | 方名（含「方」字） |
| `base_sid` / `clause_no` | 所屬條 |
| `title_track` / `ingredient_track` | 方名、藥味軌號 |
| `method_tracks` | 煎服／加減軌號（逗號分隔） |
| `herbs` / `herb_count` | 藥味名與味數 |
| `method_chars` | 煎服法字數 |

- 同名方在卷十再列一次時，會有兩列（`base_sid` 不同），這是刻意的：卷十是彙編，不是重複。
- 少數列 `method_tracks` 或 `ingredient_track` 空：原書只列方名、或卷十「於某方內加減」而無獨立藥味／煎服法。

## 3. `herbs.tsv`（87 列）

| 欄 | 說明 |
|---|---|
| `herb` | 藥名（去劑量、炮製） |
| `count` | 出現次數 |
| `formula_count` | 出現於幾首方 |
| `examples` | 前 5 首方名 |

- 只從 `formula-ingredients` 軌抽；加減法中的藥味（「加附子一枚」）暫未計入。
- 藥名未做異體合併（如「黃芩」與「黄芩」），待藥名表建立後再正規化。

## 4. 限制

- 索引是**派生表**；改軌號後要重跑 `build-indices.ts`。
- 方劑的「加減法」目前算在 `method_tracks`，沒有拆成獨立藥味；要做「方→加減」索引時再拆。
- `sections.tsv` 的 `formulas` 是不同方名數，不是方軌數；要方軌數請查 `tracks-zh.tsv` 的 `kind`。

# 辭典頁籤與條號選取

> 2026-11-05。作者要求：加辭典頁籤，讓用戶以 **1–398 條號**選取（含第 373 條）。
> **2026-11-05 更新：作者指示「辭典晚點做，目前 UI 很 confusing」；`shl.html` 已暫停收錄辭典，本檔保留設計與資料規格。**

## 1. 做了什麼

- 在 `zhu-combined` 的辭典分頁加一個 **「條」下拉選單**（`1`–`398`，另加「全部」）。
- 選第 373 條，就只顯示該條的辭典條目；目前包括：
  - 一條 **「第373條」條文條目**（本文＋書證）；
  - 該條文中出現的術語（若在 31 條術語表內）。
- 沒有選條時，顯示全部 429 條（31 術語＋398 條文）。

## 2. 資料

`window.ZHU.glossary`：

```js
{
  clauses: [{ n: 373, label: "下利欲飲水者，以有熱故也，白頭翁湯主之。" }],
  categories: [{ id: "條文", label: "條文", count: 398 }, ...],
  entries: [
    { id:"c373", term:"第373條", aliases:["373","S0373"],
      category:"條文", gloss:"下利欲飲水者……", refLabel:"宋本", ref:"373",
      clauses:[373], occurrences:[{ s:7, u:..., juan:6, quote:"……" }] },
    { id:"g1", term:"太陽", category:"六經", gloss:"……",
      refLabel:"首見", ref:"S0001.1", clauses:[1,2,...], occurrences:[...] }
  ]
}
```

- `clauses` 是該條目出現的條號；選單用它過濾。
- 條文條目由 `data/clauses.tsv` 自動產生，所以 398 條一定齊全。
- 術語條目的 `clauses` 是用「條文含此詞」的簡單比對，不是語義標注。

## 3. 閱讀器改動

`zhu-combined/app.js` 的 `GLOSS` 模組：

- `state2.clause` 記住選取的條號（存 localStorage）。
- `apply()` 若有 `state2.clause`，只留 `e.clauses` 包含該條的條目。
- `mount()` 若 `G.clauses` 存在，才插入 `.gp-clausebar`；沒有這個欄位的既有成品（楞嚴、金剛）不受影響。
- `style.css` 加 `.gp-clausebar`／`.gp-clause` 樣式。

## 4. 重建

```bash
bun run src/build-zhu-data.ts            # 句級＋辭典 → out/proto
bun run src/build-zhu-data.ts --clause   # 條級＋辭典 → out/proto-clause

cd D:\2026\zhu-combined
node build-vcpp.mjs --root D:\2026\shl\out\proto --out D:\2026\shl\out\shl-sentence.html --title "傷寒論選注" --max 16
node build-vcpp.mjs --root D:\2026\shl\out\proto-clause --out D:\2026\shl\out\shl.html --title "傷寒論選注" --max 16
```

## 5. 限制

- 術語只有 31 條，所以第 373 條目前主要是「第373條」條文條目；要讓每條都有多個術語，需擴充術語表。
- 條文條目的「書證」是條文本身，不是注疏；注疏仍走「注疏」分頁。
- 選單只過濾辭典清單，不會跳轉主文；要跳回主文，點條目下方的書證。
- 既有成品沒有 `glossary.clauses`，不會出現這個選單。

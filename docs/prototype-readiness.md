# 用 `zhu-combined` 做 prototype： readiness

> 2026-11-05。問題：目前收集的材料，夠不夠直接餵 `zhu-combined` 閱讀器做 prototype？
> 短答：**條級 prototype 已上線；句級 pilot 也上了，但仍是 coarse；談不上定本公開發布。**
>
> 2026-11-05 更新：`https://shutonggui.cn/incubator/shl.html`（條級）、
> `https://shutonggui.cn/incubator/shl-sentence.html`（句級 pilot）。

## 1. 閱讀器要什麼

`zhu-combined/app.js` 只認 `window.ZHU`：

```js
{
  meta:     { title, sub, workNames },
  versions: [{ id, label, trans, group, lang,
               sents: [{ t, u, s, p }] }],   // 主文；u=0 起，s=section
  sections: [{ n, title }],
  works:    [{ id, title, author, date, year, corpus, no, vol,
               kind, base, text, anchors: [[u,a,b,p]] }],
  glossary: { entries: [...] }               // 可選
}
```

- `works[].text` 是整部注疏的**連續字串**；`anchors` 用 char offset `a..b` 指向其中一段。
- `anchors` 的 `u` 對到 `versions[0].sents[u]`。
- 沒有 `ke`／`keTree` 也能跑；那是科判層，可後加。

## 2. 我們已經有的

| 閱讀器要的 | `shl` 現況 | 夠不夠 |
|---|---|---|
| 主文句子 | `tracks-zh.tsv` 1,757 軌 | ✅ 可直接轉 `sents` |
| 篇／節 | `sections.tsv` 24 篇（含卷首） | ✅ 可轉 `sections` |
| 條 | `clauses.tsv` 398 條 | ✅ 可當 `s` 或麵包屑 |
| 注疏全文 | `data/sources/*.html`、`out/jc-books/*.xml` | ✅ 但要先串成連續 `text` |
| 注疏→主文 | `xref.tsv` 24 家、7,978 列 | ⚠️ 條級，不是句級 |
| 注疏 metadata | `witnesses.tsv` | ✅ author／date／year 可取 |
| 辭典 | `glossary.tsv` 31 條 | ⚠️ 要轉 `glossary.entries` |
| 別本 | `align.tsv`、`tracks-witness.tsv` | ⚠️ 可做「別譯」但 reader 期待 `versions` |
| 單檔打包 | `zhu-combined/build-vcpp.mjs` | ✅ 不需改 |

## 3. 缺什麼

### 3.1 一個 `zhu-data.js` adapter（必要）

要把 `tracks-zh.tsv`、`sections.tsv`、`xref.tsv`、`witnesses.tsv` 轉成上面的 schema。
估計 150–250 行 TypeScript，半天內可完成。

最關鍵的轉換：

```text
track (S0012.1) → versions[0].sents[u] = { t, u, s: 篇序, p: '' }
clause (S0012) → 該條所有 u 的 range
xref row       → works[].anchors = [[u, a, b, p], ...]
                 a/b = 注疏段落在 works[].text 的 char offset
```

### 3.2 注疏全文的 char offset（必要）

`xref.tsv` 只給段落 id（`p436`），沒有 char offset。
adapter 要按 `parseBook()` 的段落順序串成一個 `text`，記下每段 `[start,end]`，再把 xref 的
`source_start/end` 換成 `a/b`。這一步不難，但要注意：

- 段落之間的換行要不要算進 offset；
- 同一段落被多條共用時，anchor 會重疊；
- `source_end` 可能包含下一條的引文（已知問題），要按 xref 的 span 截。

### 3.3 句級 anchors（要做「句級對讀」才需要）

目前 `xref` 是「注疏段落 → 條」。閱讀器點一句時，`byUnit` 會用 `u` 找 anchor；
如果只 anchor 到整條，點該條任何一句都會顯示同一段注。

要做句級，需要：

- 把注疏段落再切句；
- 用 8 字窗 LIS 對到該條的 sentence track；
- 每個注疏句一個 `[u,a,b,p]`。

這是下一階段（`docs/xref-notes.md` §5），不是 prototype 的前置。

### 3.4 校對（要公開發布才需要）

`confidence=C` 的 xref 會把注掛到錯的條。Prototype 可以接受，但要：

- 頁面標「draft／自動對位」；
- 只放 6–8 家 A/B 較高的注本；
- 不要當成定本引用。

## 4. 建議的 prototype 範圍

**可以做**：

- 主文：宋本 398 條，按 22 篇分節。
- 右欄：8 家（ZJ、TB、SL、LSZ、GZ、QZ、JY、JC），條級 anchor。
- 辭典：31 條（可選）。
- 書籤、搜尋、簡繁切換：閱讀器已有。
- 單檔 `shl.html`：用 `build-vcpp.mjs`，不需要改 UI。

**先不要做**：

- 句級高亮／句級對讀；
- 24 家全上（檔案會太大，且 C 級太多）；
- 別本「versions」切換（align 是條級，reader 的 versions 是句級）；
- 科判層（`ke`）——傷寒論沒有現成科判，硬套會失真。

## 5. 工作量估計

| 工作 | 估時 |
|---|---:|
| `build-zhu-data.ts`（主文＋sections＋8 家 text/anchors） | 3–4 h |
| 修正 offset／重疊 anchor／抽樣 | 1–2 h |
| `build-vcpp.mjs` 打包＋`file://` 測試 | 1 h |
| 截圖與抽樣校對 | 1 h |
| **合计** | **約 1 個工作日** |

## 6. 結論

- **Prototype（條級、8 家、內部看）**：材料夠，缺一個 adapter；**可以開工**。
- **句級對讀**：材料還不夠，缺句級 xref；先做 adapter 不影響後續。
- **公開發布**：還不夠，C 級 xref 與 base 版本都要先校。

一句話：**現在的材料足夠做「可點、可讀、可查」的條級 prototype；還不足以做「句句對得上」的定本閱讀器。**

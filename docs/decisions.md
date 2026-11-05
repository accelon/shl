# 決策紀錄

## 2026-11-05 開區

### 母工作區：暫無

`new-workspace.md` 預設要指定母工作區。本區沒有對應的母區：

- 佛典線的母區是 `adb-converter`，語料與工具（CBETA adb、漢字、頁座標）不直接用於傷寒論。
- 中醫共用資產目前只在 `agent-norms`（`tcm/` 是成品示例，不是工具庫）。

所以先寫「暫無」，只依 `agent-norms` 與閱讀器 `zhu-combined`。
**什麼情況改回來**：作者指定中醫母區時，改 `AGENTS.md` §0／§1。

### 成品形態沿用 surangama，不重寫 UI

閱讀器（`zhu-combined`）已有三欄、注疏分頁、辭典、書籤、搜尋、單檔打包。
本區只做資料與打包設定；要改閱讀器，回 `zhu-combined`，並確認不破壞金剛經／楞嚴。

### 科判先不預設

《傷寒論》傳統以六經分篇，未必有甲乙科判；若作者要科判，再找來源。

## 2026-11-05 工作順序

作者指示：先做經典母語（漢文）本文與重要週邊文獻（注疏群），再擴展至其他語種，
以驗證軌號的適用性。理由與做法見 `AGENTS.md`「工作順序」節。

## 2026-11-05 階段一實作決策

### 底本：宋本 398 條，但標明它是電子本條號

用中醫笈成《傷寒論（宋本）》作 base（`SB`），因為它已有 398 條編號、卷／篇／方結構完整。
**但它的底本是四部叢刊《註解傷寒論》，不是趙開美獨立宋本**；條號可信，字句仍要對校。

- 不用成無己本作 base：經文與注文相間、條界不同，會偏離通行引用號。
- 不用康平／桂林作 base：編次差異大、真偽有爭議；作平行本較安全。
- **什麼情況改回來**：作者指定真宋本或康平本作 base 時，改 `extract-songben.ts` 與軌號前綴，重發 rev。

### 軌號：`S<條>.<part>`／`X<段>.<part>`

條文用宋本 398 條號，非條文用全書連續段序；方接所屬條，`kind=formula-*`。
理由與不變規則見 `docs/track-scheme.md`。

- 不用 dense 全書號：插入一句就全部位移。
- X 不按篇重置：非條文文本固定，全書連續較好引用。
- **什麼情況改回來**：補入敦煌殘卷等新段時，另發 `XD` 系列，不動既有 X。

### 注疏 crosswalk：4-gram 倒排＋單調 DP，先做條級

24 家注本／別本（含 4 種早期傳本節錄、2 種 jc.adb 抽出）逐段對到宋本條（`xref.tsv`），
confidence 由 coverage 分級。這是**自動候選**，不是定論；`C` 級要人工校。

- 先條級：條界是 398 條的穩定上級；先定「哪一段注哪一條」，再細到句。
- 用 4-gram：注本異體、增刪字多，逐字比對會大量失敗。
- **什麼情況改回來**：若 C 級錯誤率過高，改回「先人工錨定每卷前 5 條，再內插」。

### cuts：目前是候選聯集，不是最小 cut set

`cuts.tsv` 收篇界、條界、段界、句讀四類，條界 `support` 由 24 家 xref 回填（5–23 家）。
依 canonical 方法，下一步才是選最小 cut set；目前不刪候選，避免過早丟證據。

### 語料來源：中醫笈成 HTML ＋ jc.adb

- HTML：`data/sources/`，唯讀，不進版控；適合逐書解析。
- `d:\accelon3\jc.adb`：337.5 MiB、1,359 本書、1.3 億字；用 `adb-converter/ts` 的 abx 匯出 XML，
  再由 `src/scan-jc.ts` 掃目錄、抽 146 本傷寒相關書。比 HTTP 抓取快，也不受 429 影響。
- 衍生資料進版控；`out/` 與 `data/sources/` 不進。
- 發布前要確認 jicheng 的授權與引用格式。

### 與 hdnj 的邊界

`shl` 不重複收《內經》《難經》全文與其注家；需要時引用 `hdnj` 的軌號。
共用程式（HTML 解析、4-gram）暫放 `shl/src/lib/`，是否提升到 `agent-norms` 待作者決定。
namespace 碰撞已處理（`LS`／`QY`／`YJ`），`src/check-namespaces.ts` 目前 OK。

## 2026-11-05 品質修正與 rev 政策

### 修 parser 的內層 span 截斷

`<span class="方">` 內含 `<span class="校">`，lazy regex 會提早收尾，導致部分方塊的煎服法
被切成正文（例：桂枝加附子湯方只剩藥味）。修法：先把 `校`／`註` span 換佔位符，
抽完方塊再還原。影響：`tracks` 1,745 → 1,752，`paras` 225 → 223，`hierarchy` 659 → 657。

其後又把卷十「於某方內加減」判為 method，`tracks` 再增至 1,757。

### rev 只增不改

每次資料模型或 parser 有實質變動，另發 rev（`a` → `b` → `c`），舊 rev 目錄保留。
最新：`rev-2026-11-05-e`；`a`–`d` 只作歷史。

- 軌號在 rev 之間仍應只增不改；這次 parser 修正不可避免改了部分方塊 part（draft 階段），
  已在 build-log 記錄。freeze canonical 前不再容許這種改動。

### 派生索引不另存座標

條（398）、方劑（141）、篇（24）、藥味（87）四個索引都由 `tracks-zh.tsv` 派生，
不另存位置；改軌號後重跑 `build-indices.ts` 即可。索引不能獨立 freeze，必須跟 tracks 同 rev。

## 2026-11-05 prototype 與句級 pilot

### 條級 prototype 先上孵化器

用 `zhu-combined/build-vcpp.mjs` 把 `tracks-zh.tsv`＋8 家注疏包成 `shl.html`，
先做條級 anchor：點一句顯示該條注。已發布 `/incubator/shl.html`（1.93 MB）；清單以 `deploy/incubator.json` 交付，未改 `projects.json`。
理由是條級 xref 已穩定到可用，句級尚未校對；先讓作者／讀者看到資料形態。

### 句級 pilot 另檔，不覆蓋條級

`data/xref-sentence.tsv`：78,283 列，quote 11,018／interp 67,265；`shl-sentence.html`（2.11 MB）
用句子 anchor；高信度 quote 直接掛，其餘依前後錨點內插，避免全部擠到第一句。
已發布 `/incubator/shl-sentence.html`，但明確標「pilot」；不覆蓋條級檔，方便對照。清單同樣只放 `deploy/incubator.json`，等維護者併入。

- **什麼情況改回來**：句級 quote 率與人工校對足夠後，才把 `shl.html` 換成句級。

### 辭典暫緩上線

作者 2026-11-05 指示：辭典晚點做，目前 UI 很 confusing。`shl.html` 只保留條級對讀，不含辭典分頁；
`data` 與 `build-zhu-data.ts` 的辭典實作保留，等 UI 整理後再開。

### ctext 不作為語料來源

ctext 的傷寒論頁面有反爬蟲與 ToS 限制，實測回傳的不是正文；API 需機構訂閱。
只作書目與掃描本線索，不抓全文。詳見 `docs/ctext.md`。

### skqs 醫家類作對校本

`sbqs-03.zi.adb` 有 103 部醫家類、2,243 卷；抽出傷寒微旨論 5 卷（20,007 字），
補上 jicheng／jc.adb 的空殼。四庫本不當 base（無 398 條號、有館臣改字），只作對校。
清單在 `data/skqs-med.tsv`，說明在 `docs/skqs.md`。

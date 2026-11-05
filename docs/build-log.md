# 傷寒論選注（shl）— 建置紀錄
#
# 每次建置一列：| 日期 | 版本或 sha | 大小 | buildTime | 說明 |

| 日期 | 版本／sha | 大小 | buildTime | 說明 |
|---|---|---:|---|---|
| 2026-11-05 | — | — | — | 工作區建立（未開工） |
| 2026-11-05 | rev-2026-11-05-a／tracks 0B7696759727 | 1.5 MB | 1.8 s | 階段一 draft：宋本 10 卷 22 篇 398 條 141 方 → 1,744 軌；cuts 1,743（support 4–19）；xref 18 家 6,493 列（gap 367）；align 1,132 列；witnesses 47 筆（33 已下載） |
| 2026-11-05 | rev-2026-11-05-b／tracks B7F202C291D6 | 2.1 MB | 3.3 s | draft 2：1,745 軌；cuts 1,744（support 3–21）；xref 22 家 7,197 列（gap 594；加入脈經／千金翼／外臺／聖惠方）；witness tracks 1,471；variants 543；cut-review 23；xref-review 44 |
| 2026-11-05 | rev-2026-11-05-c／tracks F478A6CB89FE | 2.1 MB | 3.2 s | draft 3：修 parser 內層 span 截斷、方塊 role → 1,757 軌；cuts 1,756（support 5–23）；hierarchy 657；xref 24 家 7,978 列（gap 615；加入補亡論、曹氏）；indices 398／141／24／87；glossary 31；jc.adb 1,359 書目；validate OK |
| 2026-11-05 | rev-2026-11-05-d／tracks F478A6CB89FE | 7.5 MB | 3.3 s | draft 4：xref-sentence 78,283 列（quote 11,782）；skqs 醫家類 103 部／2,243 卷，補傷寒微旨論 5 卷；zhu-combined 條級 1.93 MB／句級 2.05 MB；已發布 `/incubator/shl.html`、`/incubator/shl-sentence.html`；清單 `deploy/incubator.json`（未改 projects.json）；validate OK |
| 2026-11-05 | rev-2026-11-05-e／tracks F478A6CB89FE | 7.5 MB | 3.3 s | draft 5：句級 xref 改單調錨點＋前後內插（quote 11,018／interp 67,265）；辭典 429 條、1–398 條號選取；條級 2.10 MB／句級 2.11 MB 已重新上傳；validate OK |
| 2026-11-05 | rev-2026-11-05-e／tracks F478A6CB89FE | 7.5 MB | 3.3 s | 作者指示辭典暫緩、UI 簡化：條級 shl.html 1.94 MB（無辭典、無注數標記），已上傳；句級檔保留但不列入 manifest；清單 deploy/incubator.json 只列條級 |

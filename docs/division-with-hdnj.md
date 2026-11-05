# 與 `hdnj`（黃帝內經選注）的分工

> 2026-11-05。分工的 canonical 在 `D:\2026\hdnj\docs\division-with-shl.md`；
> 本檔只記 `shl` 這一端要注意的事，不重複內容。

要點：

1. **以書為界**：`hdnj` 管內經系（素問、靈樞、太素、甲乙經、難經、內經注疏），
   本區管傷寒論系（宋本、成無己、桂林古本、康平／康治、傷寒注疏）。
2. **同作者不同書各自收**：張志聰、滑壽、汪昂、黃元御等，不互相等、不互相覆蓋。
3. **共用原始語料**：`D:\2026\hdnj\data\jcdata\` 是笈成 sparse clone（唯讀）。
   本區要用的書若已在那裡，直接讀，不重下；本區自己的 `data\sources\` 不搬動。
4. **重疊書**（脈經、病源、千金、外臺、醫心方）：原檔共用，各自只切自己那條線的軌。
   2026-11-05 實測：`shl\data\sources\maijing.html` 與 `hdnj` 的 `MJ` **同版同檔**
   （sha256 相同）；`qianjin.html` 實為《千金翼方》清掃葉山房本，與 `hdnj` 的 CM039
   文本不同版；`外臺秘要.html` 為明崇禎本，與 `hdnj` 的笈成本不同版。詳見
   `D:\2026\hdnj\docs\division-with-shl.md` §3.1。
5. **交叉引用**：傷寒論注引內經處，本區已有 `data\xref-hdnj.tsv`（成無己 2 條，
   對到 `hdnj` 的 `SW66-011.8`、`SW31-007.1`）；`hdnj` 端鏡像為
   `D:\2026\hdnj\data\xref-shl.tsv`。不寫入對方的資料檔。
6. **不重複勞動**：取源前先看 `D:\2026\hdnj\data\sources.tsv` 與 `docs\witnesses.md`。

本區較詳細的分工與進度見 `docs\sister-hdnj.md`；方法論 canonical：
`D:\2026\agent-norms\shutonggui.md`。

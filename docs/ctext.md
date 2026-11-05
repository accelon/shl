# ctext.org 可用材料評估

> 2026-11-05。問題：ctext.org 有沒有可以直接拿來做《傷寒論》的材料？

## 1. 結論

**沒有可直接批次取用的材料。** ctext 的傷寒論條目是給人閱讀的，頁面有反爬蟲／防批量下載；
條款明確禁止 scraping。要機器可讀，只能走它的 **JSON API／Python 模組**，而那需要機構訂閱。

因此 `shl` 不從 ctext 抓全文；只把 ctext 當**書目與掃描本線索**。

## 2. 實際測試

- 以 `https://ctext.org/wiki.pl?if=gb&res=403381`（傷寒論集注）測試：
  HTTP 200，但回傳的是「Checking the security of your connection…」與反爬蟲聲明，
  不是正文。
- 頁面明說：研究者應請機構訂閱；scraping 違反 ToS，且會間歇回傳**故意損壞**的資料。
- 所以即使強行抓，資料也不可信；不能當校本。

## 3. ctext 仍有的價值

| 用途 | 怎麼用 |
|---|---|
| 版本線索 | ctext library 的掃描本連結（如四部叢刊、宋本系統） |
| 書名／作者／卷數核對 | 人工查閱 |
| 取得合法 API | 若作者或機構有訂閱，用 ctext JSON API 取正文，再以 `data/sources/` 為快取 |

## 4. 目前替代來源

| 來源 | 狀態 |
|---|---|
| 中醫笈成 HTML | 33 本，逐書解析 |
| `d:\accelon3\jc.adb` | 1,359 本，146 本傷寒相關，已抽 8 家 |
| `d:\accelon3\skqs\sbqs-03.zi.adb` | 四庫子部醫家類 103 部，已補傷寒微旨論 |
| Kanripo | 四部叢刊文字版；可作宋本對校（未批次接入） |

## 5. 待作者決定

1. 是否有 ctext 機構訂閱？若有，可申請 API key，抓特定幾本作對校。
2. 沒有的話，維持 jicheng＋jc.adb＋skqs 三源；ctext 只作書目。
3. 要不要把 Kanripo 的四部叢刊《註解傷寒論》接入，作真宋本對校？

# 北車好走 Station Steps

2026 TownPass Codefest｜台北車站多語地圖、語音與 AR 分段導航。

讓旅客從眼前地標出發，先確認路線，再逐段找到月台、出口或轉乘連通端。

## 使用流程

首頁 → 選擇起點與目的地 → 預覽路線 → 開始導航 → 確認抵達。

- 起點：樓層篩選、地標搜尋或地圖選點。
- 目的地：板南線／淡水信義線／出口／機場捷運四類；月台再選方向，出口選 M1–M8。其他地標可搜尋或在地圖上選擇。
- 預覽：檢視路線、樓層、過閘與路段數，支援縮放及平面／立體顯示。
- 導航：目前路段突出顯示、自動朗讀、可選用 AR；到地標時由使用者確認下一段。
- 抵達：重新規劃新路線，清除上一趟起終點與進度。

## 功能與範圍

| 項目 | 現況 |
| --- | --- |
| 語言 | 繁中／英文／印尼文；來源底圖保留原文 |
| 路網 | G、B1–B4；120 節點、142 連線 |
| 找路 | 依序優先減少過閘次數、跨樓層數、路段數；不是最短實際距離 |
| 定位 | 手動選地標、手動確認抵達；沒有室內 GPS 自動定位 |
| 語音 | Web Speech API；TownPass Android 可搭配原生 TTS 橋接，需對應 App 版本及語音包 |
| 方向 | 使用可用的絕對方位感測；無資料時以路線方向顯示 |
| AR | 相機疊加地面引導與小地圖，依步伐估算；不是 ARCore／ARKit 錨定定位 |
| 照片辨識／AI | 尚未串接；目前沒有執行期 AI 模型或雲端推論 |

## 技術棧

- 前端：HTML、CSS、原生 JavaScript ES Modules，無前端框架。
- 地圖：Canvas 2D、樓層底圖與 JSON 路網；未使用 Google Maps、Mapbox 或地圖 SDK。
- 路線：自訂圖搜尋，以三維成本做字典序比較。
- 裝置：getUserMedia、DeviceOrientation／DeviceMotion、Web Speech API。
- 主程式：TownPass Flutter／Dart WebView；Android Kotlin TextToSpeech。
- 工具：Node.js 本機靜態伺服器、檢查與建置腳本；Firebase Hosting 可選部署。
- 設計：依 TownPass DEVELOPMENT_GUIDE 與 TPColors 主色 #5AB4C5、輔色 #F5BA4B。

## 本機開發

建議 Node.js 22 以上。核心網頁、本機伺服器與檢查腳本使用 Node 內建模組，不需先安裝 Firebase CLI。

```sh
npm run dev
# http://localhost:5173
npm run check
npm run build
```

PowerShell 指定連接埠：`$env:PORT='5194'; npm run dev`。
`npm run check` 檢查模組語法與英文／印尼文地標翻譯完整性；不代表相機、語音或實際路線已通過驗證。

## 檔案結構

```text
app.js / index.html / style.css       首頁、語言與共用版面
navigation/integration.mjs            流程與頁面狀態
navigation/location-picker.mjs        起終點選擇
navigation/station.json               路網、資料來源與未確定項目
navigation/routes.mjs / scene.mjs     找路與 Canvas 地圖
navigation/ar-*.mjs / motion.mjs      AR、路段與步伐估算
navigation/compass.mjs / speech.mjs   方位與語音
navigation/labels.mjs                 地標、設施、樓層翻譯
scripts/                             檢查、建置與整合工具
docs/                                開發指南參考
townpass-integration/                 App 端整合參考檔，非完整 Flutter 專案
```

## TownPass 整合與部署

1. `npm run build` 產生 dist/。
2. 需要部署時，執行 `npm ci` 安裝開發工具，登入 Firebase、選擇自己的專案，再執行 `npm run deploy`。請勿直接沿用其他人的 Firebase 專案。
3. 將 HTTPS 網址填入 TownPass 的服務 destinationUrl，新增服務入口並重新建置 App。
4. 語音橋接使用 `window.flutterObject.postMessage()`，訊息名稱為 `station_speech`，動作為 `speak` 或 `stop`，並帶有 requestId。一般瀏覽器優先使用 Web Speech。
5. `townpass-integration/` 為現有 App 端檔案快照；需人工合併到相容的 TownPass checkout，不可當作完整 App 直接建置。檢查允許來源、Manifest 的 TTS 查詢宣告及原生 MethodChannel。

只有更新網站，不會將新的 Android TTS 或原生標題列修改加入已安裝的 App。相機及部分感測功能需 HTTPS、安全來源與使用者授權；語音可用性依裝置而定。

## 限制與驗證

- 路網由平面圖、剖面圖與站內設施資料人工整理，含推定連線，尚未完成現場驗證。來源見 station.json 的 sources／issues。
- 機捷、台鐵、高鐵及地下街僅導引至既有路網中的連通端；不表示涵蓋整座站體。
- AR 步長預設 0.65 公尺，底圖比例與北方角度為估計，不保證精準距離、定位或轉向。
- 行動裝置與 WebView 的方位感測、相機、語音包可能不同；實機效果需測試。
- 預設路線不保證無障礙、電梯可用或設施即時開放；請配合現場標示。
- 未完成 iOS／Android 全流程及斷線回復驗證，不宣稱正式上線品質。
- 不提供照片上傳／辨識；語言偏好保存在本機 localStorage。

## 資料來源與授權

路網來源與判讀記錄保留於 navigation/station.json。Roboto 字型授權見 navigation/assets/roboto-OFL.txt。
本專案原創程式採 AGPL-3.0-only；TownPass 上游程式依其原有 GPL-3.0 授權，App 整合檔不變更上游授權。第三方圖資、字型與文件保留原權利；本專案授權不授予第三方素材的額外權利。正式交付請一併保留主辦指定聲明與上游授權。

提案文案與講者 PDF 另外交付，不包含在本 repository。

# Known Issues & Limitations (已知限制與問題排解)

本文件列出 Google Apps Script、Telegram Bot API 與 Gemini API 在本架構下的已知平台限制、可能遭遇的情境與建議排解方案。

---

## 1. Telegram Webhook 重試風暴（Bot 一直重複發送訊息）⚠️

### 1.1 現象描述
傳送了一次 `/start` 或一個問題，機器人每隔 1~2 分鐘就瘋狂重複回覆相同的內容。

### 1.2 根本原因
Telegram 官方 Webhook 機制具備「重試政策 (Retry Policy)」：
- 當 Telegram 伺服器向 GAS 發出 Webhook POST 請求後，若 Google Apps Script 執行稍慢，或回應的格式未在短時間內被 Telegram 辨識為 200 OK，Telegram 會判定該則訊息「投遞失敗」。
- 判定失敗後，Telegram 會在接下來的幾分鐘內**自動且反覆重新投遞該則訊息**。
- 若程式碼沒有做「**訊息 ID 去重 (Deduplication)**」，每次 Telegram 重送，GAS 就會重複執行一次並發送回覆，導致回覆像鬼打牆一樣一直狂發。

### 1.3 解決方式（已在 v1.2.0 修復）
1. **立即停止狂發（清空積壓佇列）**：
   - 打開 GAS 編輯器中的 `Telegram.gs`。
   - 上方選單選擇 **`clearTelegramPendingUpdates`** 函式，點擊「**執行**」。
   - Telegram 會立刻將所有積壓在伺服器端重試佇列中的請求全部作廢，重複發訊立即停止！
2. **更新程式碼**：
   - 將最新的 `Main.gs` 與 `Telegram.gs` 複製貼到 GAS 編輯器。
   - 點擊「**部署 ➔ 管理部署作業 ➔ 編輯 ➔ 選擇新版本 ➔ 部署**」（務必發布新版本！）。
   - 最新程式碼已內建 `update_id` 快取去重，同一則訊息在 5 分鐘內絕不重複處理。

---

## 2. Google Apps Script 平台限制

### 2.1 程式碼修改後未生效
- **現象**：修改了 GAS 編輯器中的程式碼，但 Telegram 機器人回應的仍然是舊版邏輯。
- **原因**：Google Apps Script 的 Web App 網址是綁定特定「部署版本 (Version)」。直接修改程式碼並點擊儲存，不會自動覆蓋正在線上運行的部署。
- **排解方式**：
  1. 點擊 GAS 編輯器右上角「部署」按鈕。
  2. 選擇「**管理部署作業** (Manage deployments)」。
  3. 點選左側目前的 Web App，點擊右上角鉛筆圖示（編輯）。
  4. 在「版本 (Version)」下拉選單中選擇「**新版本** (New version)」。
  5. 點擊「部署」即可生效。

### 2.2 單次執行時間上限 (Execution Time Limit)
- **限制**：Google Apps Script 個人 Google 帳號單次腳本執行上限為 **6 分鐘**。
- **影響評估**：Gemini Flash 回應一般文字問答平均耗時 1~3 秒，遠低於上限。

### 2.3 UrlFetchApp 每日呼叫上限
- **限制**：免費個人 Google 帳號每日 `UrlFetchApp` 請求次數上限為 20,000 次。

---

## 3. Gemini API 限制與應對

### 3.1 填寫不存在模型或微服務端點未開放 (HTTP 503 / 404)
- **現象**：設定了未公開的模型（例如 `3.8-flash`），Google 閘道器因找不到後端集群而回傳 `HTTP 503 Service Unavailable / Overloaded` 或 `HTTP 404 Not Found`。
- **排解與防禦機制 (已於 v1.9.3 實作)**：
  1. **自動容錯備援 (Model Fallback)**：當自訂模型遇到 503 或 404 時，系統自動切換為預設穩定模型 `gemini-2.5-flash` 重試，永遠不斷線。
  2. 若需正式切換模型，請在 GAS 編輯器執行 `listGeminiModels()` 查詢目前 API Key 支援的所有合法代號，再更新至「指令碼屬性」。

### 3.2 敏感評價提問觸發安全性過濾 (SAFETY Filter) 與空白回覆防禦
- **現象**：詢問特定人名之校園評價時，可能觸發 Gemini 預設安全審查，導致回傳空內容與 `finishReason: 'SAFETY'`。
- **排解與防禦機制 (已於 v1.9.3 實作)**：
  1. 將安全過濾等級調降至 `BLOCK_ONLY_HIGH`，避免校園通識課評價被誤判為騷擾。
  2. 實作非空字串檢驗，若內容為空嚴禁標記為成功，並拒絕寫入多輪對話快取，徹底杜絕幽靈訊息與歷史快取污染。

### 3.3 Free Tier 速率與用量限制 (HTTP 429)
- **官方限制 (Gemini Flash Free Tier)**：
  - **RPM (每分鐘請求數)**：15 次
  - **RPD (每日請求數)**：1,500 次
  - **TPM (每分鐘 Token 數)**：1,000,000 Tokens
- **應對機制**：程式碼中已捕捉 HTTP 429，若觸發會提示使用者稍候 1~2 分鐘。

---

## 4. Telegram API 限制與應對

### 4.1 單則訊息長度限制 (4096 字元)
- **應對機制**：本專案在 `Telegram.gs` 的 `sendTelegramMessage` 中實作了**自動智慧切割**。當 Gemini 回覆超過 4000 字元時，會尋找最近的換行處將文字分段，依序發送多則訊息。

### 4.2 HTML 標籤格式錯誤回退機制
- **應對機制**：`_sendTelegramRequest` 內建自動降級重試機制。若 HTML 格式發送失敗，會自動退回純文字模式重新發送，確保訊息絕不遺失。

---

## 5. 即時資料檢索 (WebSearch) 限制與應對

### 5.1 Google News RSS 覆蓋範疇限制
- **現象**：查詢「這位老師在 Dcard 評價」時，Google News RSS 僅能涵蓋有被新聞報導之事件，對於社群論壇（如 Dcard、PTT）之私人討論串涵蓋有限。
- **排解方式與優化**：
  - 系統內建 `filterRelevantArticles`，若檢索之新聞未實質包含目標實體名稱（例如誤撈出銘傳大學、兒童美語等不相干報導），系統會主動剔除該雜訊，回覆末尾不貼不相關之參考來源。
  - 第二版 (Phase 2) 規劃串接專用搜尋 API（如 Tavily 或 Google Custom Search API）補足校園社群討論之深度。

### 5.2 多輪話題轉移後的代名詞指代殘留
- **現象**：若在探討完「東華大學陳文盛老師」後，突然追問「他在哪裡比賽？」，系統可能仍保留前一主題之主詞。
- **排解方式**：傳送 `/reset` 指令即可立即清除 20 分鐘對話快取，重啟全新主題討論。

---

## 6. 平臺特性差異與 LINE Bot 雙軌規劃

### 6.1 第一版為何優先採用 Telegram Bot？
1. **零成本推播**：Telegram Bot API 完全免費且無推播訊息次數限制；LINE Official Account 免費方案每月限制僅 200 則訊息，測試期容易迅速耗盡。
2. **動態就地更新 (Progressive UX)**：Telegram 支援 `editMessageText` 原生訊息置換，能在 0.5 秒內發送「處理中/檢索中」動態看板並原地替換為答案；LINE Messaging API 不支援修改已發送訊息，必須發送多則獨立訊息，容易造成介面雜亂。
3. **單則文字長度**：Telegram 單則支援 4096 字元並支援 HTML 排版；LINE 單則文字上限為 1000 字元且不支援 HTML。

### 6.2 第二版 (Phase 2) LINE Bot 整合規劃
- 第二版將在 `src/Main.gs` 新增 LINE Webhook 簽章驗證與 Reply API 支援，共用 `Gemini.gs`、`WebSearch.gs`、`Storage.gs` 與 `QuotaManager.gs` 核心業務邏輯，達成 Telegram & LINE 雙軌跨平臺部署。

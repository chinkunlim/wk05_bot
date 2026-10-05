# Architecture Decision Records (ADR)

本文件記錄專案在架構與技術選型上的關鍵決策、背後考量與權衡結果。

---

## ADR-001: 採用 Google Apps Script (Container-Bound) 搭配 Google Sheets

- **狀態**：Accepted (已採納)
- **背景**：需要一個能夠 24/7 全天候運行的 Telegram Bot，串接 Gemini API 並記錄問答歷程，且希望免伺服器費用、避免依賴本地端電腦長時間開機。
- **決定**：選擇 **Google Apps Script (Container-Bound)**。
- **後果**：100% 免費、官方 24/7 託管、自動處理 HTTPS 憑證、直接利用 `SpreadsheetApp.getActiveSpreadsheet()` 存取試算表。

---

## ADR-002: 免費額度防護機制 (白名單 + Script Properties 計數器)

- **狀態**：Accepted (已採納)
- **背景**：Telegram Bot 部署為公開 Webhook 後，任何知道 Bot 用戶名的人皆可向其發送訊息。若無限制，Gemini Free Tier 額度容易被路人耗盡。
- **決定**：採用**嚴格白名單驗證 (`ALLOWED_USER_IDS`)** 搭配 **Script Properties 當日計數器 (`MAX_DAILY_REQUESTS`)**。

---

## ADR-003: 短期對話記憶選用 CacheService

- **狀態**：Accepted (已採納)
- **背景**：連續對話需要將前幾輪對話內容作為上下文傳給 Gemini，但對話記憶具有「時效性」。
- **決定**：選用 **`CacheService.getScriptCache()`**，預設快取 20 分鐘 (1200 秒)，保留最新 4 輪對話，並提供 `/reset` 一鍵清除。

---

## ADR-004: 選用 Gemini Flash 系列模型

- **狀態**：Accepted (已採納)
- **背景**：Gemini Flash 反應速度最快、延遲最低，Free Tier 額度上限較大。
- **決定**：選用 Flash 系列作為主要對話引擎。

---

## ADR-005: 模組化 .gs 檔案架構兼顧瀏覽器與本地備份

- **狀態**：Accepted (已採納)
- **決定**：將程式碼依職責拆分為 `Config.gs`、`Telegram.gs`、`Gemini.gs`、`QuotaManager.gs`、`Storage.gs`、`Main.gs`。

---

## ADR-006: 內建 GAS Webhook 管理函式代替終端機 curl

- **狀態**：Accepted (已採納)
- **決定**：在 `Telegram.gs` 內建 `setupTelegramWebhook()`、`getTelegramWebhookInfo()` 與 `deleteTelegramWebhook()`。

---

## ADR-007: 模型動態配置與自動查詢小工具 (`listGeminiModels`)

- **狀態**：Accepted (已採納)
- **決定**：新增 `listGeminiModels()` 函式查詢模型清單，並在 `Config.gs` 支援由 `PropertiesService` 讀取 `GEMINI_MODEL`。

---

## ADR-008: 導入 Google Search Grounding (即時聯網搜尋與來源引注)

- **狀態**：Accepted (已採納)
- **背景**：純 LLM 僅能憑訓練記憶接龍（Next-token prediction），在被詢問「今天天氣」、「時事新聞」或「學校特定教師最新開課」等即時世界資料時，容易產生幻覺或直接回覆「無法提供即時資訊」。
- **決定**：
  1. 在 `Gemini.gs` 呼叫中預設掛載 `tools: [{ "google_search": {} }]`。
  2. 自動由 API 回傳之 `groundingMetadata.groundingChunks` 解析真實網頁標題與連結，在回覆末尾自動列出參考來源。
  3. 支援透過「指令碼屬性」以 `ENABLE_GOOGLE_SEARCH`（布林值）開關此功能。
- **後果**：
  - **優點**：AI 具備查證即時資料之能力，回答具備依據與可信度，徹底擺脫「純文字接龍」。
  - **權衡**：掛載搜尋工具可能微幅增加生成延遲約 0.5~1 秒，但換得資訊準確性。

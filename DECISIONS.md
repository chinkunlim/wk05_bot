# Architecture Decision Records (ADR)

本文件記錄專案在架構與技術選型上的關鍵決策、背後考量與權衡結果。

---

## ADR-001: 採用 Google Apps Script (Container-Bound) 搭配 Google Sheets

- **狀態**：Accepted (已採納)
- **決定**：選擇 **Google Apps Script (Container-Bound)**，100% 免費、官方 24/7 託管、自動處理 HTTPS 憑證、直接利用 `SpreadsheetApp.getActiveSpreadsheet()` 存取試算表。

---

## ADR-002: 免費額度防護機制 (白名單 + Script Properties 計數器)

- **狀態**：Accepted (已採納)
- **決定**：採用**嚴格白名單驗證 (`ALLOWED_USER_IDS`)** 搭配 **Script Properties 當日計數器 (`MAX_DAILY_REQUESTS`)**。

---

## ADR-003: 短期對話記憶選用 CacheService

- **狀態**：Accepted (已採納)
- **決定**：選用 **`CacheService.getScriptCache()`**，預設快取 20 分鐘 (1200 秒)，保留最新 4 輪對話，並提供 `/reset` 一鍵清除。

---

## ADR-004: 選用 Gemini Flash 系列模型

- **狀態**：Accepted (已採納)
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
- **決定**：在 `Gemini.gs` 呼叫中支援掛載 `tools: [{ "google_search": {} }]` 並解析 `groundingMetadata`。

---

## ADR-009: Search Grounding 429 智慧無縫降級與即時時間注入

- **狀態**：Accepted (已採納)
- **背景**：Google AI Studio 對未綁定信用卡之免費專案，Google Search Grounding 配額設為 0，導致開啟搜尋時回傳 HTTP 429；且模型知識截止於 2025 年，未給予時間時會誤認今年為 2025 年。
- **決定**：
  1. 在 `payload.systemInstruction` 動態注入台北當前確切時間與年份（例如 `2026年10月05日`），矯正模型時間基準。
  2. 若遇到 Grounding 引發的 429 限額或工具不支援錯誤，程式自動於背景移除 `tools` 參數無縫降級為標準生成模式重新取得回覆。
- **後果**：
  - **優點**：使用者開啟 `ENABLE_GOOGLE_SEARCH` 也絕不拋錯；AI 永遠掌握當前確切時序（知道今年是 2026）。

---

## ADR-010: GAS 雲端原生「類 Grounding」即時資料檢索系統

- **狀態**：Accepted (已採納)
- **背景**：免費用戶無法使用 Google Search Grounding 工具（配額為 0 造成 429 拒絕）。需要一種不需付費、不需綁定信用卡，且能在 GAS 內部自給自足取得最新外部時事資訊的機制。
- **決定**：
  1. 新增 `src/WebSearch.gs` 模組，利用 GAS 原生之 `UrlFetchApp.fetch()` 免費抓取 Google News RSS 即時時事新聞。
  2. 採用「智慧關鍵詞意圖偵測」與「`/search`、`/news` 指令」雙軌觸發機制，維持一般對話低延遲。
  3. 正規表達式高效清洗 HTML 雜訊，精簡文字至 1200 字以內，包裝成背景 Context 注入 Gemini Prompt。
  4. 產出之回答末尾自動追加 `🔍 即時檢索來源（GAS 雲端即時資訊）` 與原始超連結。
- **後果**：
  - **優點**：100% 免費（GAS 每日提供 20,000 次 UrlFetch 配額），徹底繞過 Google Search Grounding 付費門檻；時事回答精準可靠。
  - **權衡**：檢索時會微幅增加 0.8~1.5 秒網路請求時間，但透過關鍵詞偵測將影響限縮於必要之時效問題。

---

## ADR-011: 原地編輯訊息 (editMessageText) 即時狀態反饋與全域錯誤透傳機制

- **狀態**：Accepted (已採納)
- **背景**：在長對話生成或外部網路檢索時，耗時通常為 2~4 秒。若無任何即時回饋，使用者容易誤以為「系統當機、沒有反應、不知是否成功」；且先前 `doPost` 捕捉異常時未向用戶端發送通知，形成靜默失敗。
- **決定**：
  1. 在 `src/Telegram.gs` 實作 `editTelegramMessage(chatId, messageId, text)`，封裝 Telegram `editMessageText` API。
  2. 收到訊息後立即（0.5 秒內）發送狀態訊息（`🔍 正在檢索...` 或 `⏳ 思考生成中...`），取得 `statusMsgId`。
  3. 檢索與生成完成後，透過 `editMessageText` 將狀態訊息原地置換為最終解答；若發生異常則原地更新為 `❌ 處理失敗：詳細錯誤原因`。
- **後果**：
  - **優點**：極致順暢的 UX 體驗（不洗版、不重複發出提示音），消滅靜默失敗，讓使用者始終掌握 Bot 運行狀態。
  - **權衡**：需額外發送一次 Telegram API 請求，但換得無可比擬的透明度與使用者信心。

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-10-05

### Added
- **Google Search Grounding (即時聯網搜尋) 支援**：
  - 在 `Gemini.gs` 掛載 `google_search` 工具，賦予 AI 即時上網搜尋真實資料之能力。
  - 遇到即時天氣（例如：花蓮今日降雨）、時事新聞、教授當前開課與人物資訊時，不再單純靠訓練資料接龍，而是能即時 Google 最新資訊並彙整回答。
- **自動解析與附帶 Grounding 參考來源網址**：
  - 自動從 `groundingMetadata.groundingChunks` 提取網頁標題與連結，在回覆末尾自動生成可點擊之 `🔍 參考來源` 列表。
- **靈活控制開關 (`ENABLE_GOOGLE_SEARCH`)**：
  - 在 `Config.gs` 與「指令碼屬性」支援開關設定（預設為開啟 `true`），可隨時無碼切換。

## [1.5.0] - 2026-10-05

### Added
- **大幅提升單次最大輸出長度 (`maxOutputTokens: 8192`)**：
  - 將 Gemini 單次輸出上限由 2048 擴充 4 倍至 8192（約可生成 3,000 ~ 5,000 中文字），徹底解決長篇回答中途突然斷字的問題。
- **長度截斷感知與自動引導提示**：
  - 在 `Gemini.gs` 檢查 `candidate.finishReason === 'MAX_TOKENS'`，若真的觸及輸出上限中斷，會自動在結尾附帶「請回覆『繼續』讓我接著回答」的貼心指引。
- **「繼續」指令無縫接續優化**：
  - 支援「繼續」、「請繼續」、「continue」、「接著說」、「接續」等意圖，自動導引 Gemini 緊接著前文未完之處無縫接續說明，不重複前面已經說過的引言。
  - 接續內容自動於快取歷史中合併，維持最連貫完整的上下文記錄。
- **未閉合粗體自動補齊 (`markdownToTelegramHtml`)**：
  - 若文字在粗體 `**` 中途截斷，自動修復閉合粗體標籤，避免裸露雙星號符號。

## [1.4.0] - 2026-10-05

### Fixed
- **Gemini 暫時過載 (HTTP 503 / 500) 自動重試機制**：
  - 在 `Gemini.gs` 加入最多 2 次、間隔 1.5 秒之指數退避重試邏輯。
  - 當 Google 官方免費伺服器尖峰時段發生暫時性 503 / 500 壅塞時，自動於背景完成重試，大幅降低「暫時無法回應」之機率。
  - 將非預期錯誤訊息升級為精確回報（帶有 HTTP 狀態代碼與 Google API 回應詳情），取代過去籠統的錯誤文字。

## [1.3.0] - 2026-10-05

### Added
- **Gemini Markdown 自動轉換為 Telegram HTML (`markdownToTelegramHtml`)**：
  - 在 `Telegram.gs` 實作自動轉譯工具，自動將 Gemini 輸出的標準 Markdown（`###` 標題、`**` 粗體、`*` 列表清單符號、`---` 分隔線、代碼塊、超連結）精準轉換為 Telegram 支援之美觀排版。
  - 徹底解決回覆中出現裸露的 `###` 與 `**` 語法字符問題。
  - 自動跳脫 HTML 特殊字元 `<` 與 `>`，避免 Telegram 報錯。
- **快取環境變數讀取以降低響應延遲**：
  - 在 `Config.gs` 導入記憶體級 `_cachedEnv`，減少重覆呼叫 `PropertiesService` 所造成的延遲。
- **防止回覆引用遺失錯誤 (`allow_sending_without_reply`)**：
  - 在 Telegram API 發送選項中啟用此參數，確保即使引用的訊息已被刪除或不存在，依然能順利發送回覆。

## [1.2.0] - 2026-10-05

### Fixed
- **Telegram 重複狂發訊息問題 (Webhook 重試風暴修復)**：
  - 在 `Main.gs` 導入基於 `update.update_id` 的 **快取冪等性去重防護 (`CacheService`)**，自動過濾 Telegram 伺服器在網路延遲時重複送出的相同請求。
  - 改用 `HtmlService.createHtmlOutput('OK')` 取代 `ContentService`，避免 Apps Script 重導向造成的 HTTP 狀態碼識別問題。
- **一鍵清空卡死重試佇列 (`clearTelegramPendingUpdates`)**：
  - 在 `Telegram.gs` 新增一鍵清除積壓請求工具，並於 `setupTelegramWebhook` 預設啟用 `drop_pending_updates=true`，徹底終結重複訊息迴圈。

## [1.1.0] - 2026-10-05

### Added
- **一鍵查詢可用模型清單 (`listGeminiModels`)**：在 `Gemini.gs` 新增此函式，使用者可在 GAS 編輯器直接執行，自動向 Google API 查詢其金鑰支援的最新對話模型代號，避免因官方版本迭代而選錯模型。
- **動態自訂模型 (`GEMINI_MODEL`)**：在 `Config.gs` 與 `ScriptProperties` 支援自訂模型名稱（預設備援為 `gemini-2.0-flash`），日後推出新模型無需修改程式碼即可於後台一鍵升級。
- **HTTP 404 模型停用友善防護**：若所選模型退場或不存在，Bot 會主動提示使用者執行 `listGeminiModels()` 進行檢查。

## [1.0.0] - 2026-10-05

### Added
- **100% 雲端 GAS 24/7 架構**：基於 Google Apps Script (Container-Bound) 實作 Telegram Webhook 服務，免本地伺服器、電腦關機亦能全時運行。
- **Gemini REST API 串接**：支援向 Google Gemini REST API 發送請求，自動解析回應文字與 Token 用量數據。
- **短期上下文記憶機制**：利用 Google Apps Script `CacheService` 維持最近 4 輪對話脈絡（有效時間 20 分鐘），支援自然連續對話。
- **免費用量安全防護 (Quota & Whitelist)**：
  - 白名單驗證 (`ALLOWED_USER_IDS`)：未授權使用者無法觸發 Gemini，並會自動回傳其 Telegram User ID 便於管理員加入。
  - 每日上限防護 (`MAX_DAILY_REQUESTS`)：利用 `PropertiesService` 自動記錄並計算當日累計使用量，超過額度時自動攔截並友善提醒，避免產生非預期費用或觸發 429 速率限制。
- **Google Sheets 問答日誌記錄**：
  - 每筆問答自動記錄：時間戳記、使用者 ID、使用者名稱、提問內容、Gemini 回答、輸入 Tokens、輸出 Tokens、總計 Tokens、當日累計次數。
  - 內建 `initSheetHeader()` 自動建立並美化表頭與凍結首列。
- **Telegram 豐富指令支援**：
  - `/start`：歡迎訊息與指令介紹。
  - `/status`：查看當前日期已使用次數、剩餘次數與每日上限。
  - `/reset`：手動清空個人短期對話記憶。
  - `/help`：操作手冊與說明。
- **免終端機的一鍵 Webhook 管理**：
  - 內建 `setupTelegramWebhook()`：直接在 GAS 編輯器點擊執行即可向 Telegram 註冊 Webhook。
  - 內建 `getTelegramWebhookInfo()` 與 `deleteTelegramWebhook()` 便於偵錯與維護。
- **長文字智慧切割**：針對超過 Telegram 4096 字元限制之回覆，自動以 4000 字元為單位智慧分段發送。
- **完整專案規格文件**：建立 `README.md`、`DECISIONS.md`、`CHANGELOG.md`、`KNOW_ISSUES.md` 與 `AGENTS.md`。

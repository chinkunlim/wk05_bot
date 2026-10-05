# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.5] - 2026-10-05

### Fixed
- **修復相關性過濾器過度誤殺複合詞漏洞 (Sub-token & 2-gram Relevance Matching)**：
  - 徹底解決使用者提問如「台灣亞運會今年的金、銀、銅牌的數量是多少？」時，爬蟲雖成功抓取 8 篇亞運新聞，卻因過濾器生硬比對完整字串「台灣亞運會」而將 8 篇有效新聞全部誤判為無效噪音丟棄的痛點。
  - 實作前綴清洗（提煉核心詞「亞運會」）與 2-gram 詞素萃取（提煉「亞運」、「銅牌」等），使 8 篇即時體育新聞 100% 成功通過相關性校驗並注入 Gemini Prompt。
- **即時檢索成果狀態動態顯示**：
  - 在 `Main.gs` 的原地更新狀態訊息中加入命中篇數提示（例如 `🧠 即時資料檢索完成（成功獲取 4 篇最新相關資訊），正在分析彙整回答...`），提升操作透明度。

## [1.9.4] - 2026-10-05

### Changed
- **全面移除特定實體硬編碼，轉為 100% 通用開放式檢索架構 (Zero Hardcoding Principle)**：
  - 徹底移除特定縣市座標字典、校名、教授名或特定主題硬編碼，確保能通用應對使用者的任意隨機提問。
  - 採用通用 NLP 斷詞萃取器：自動清洗特殊標點、疑問助詞、時間贅詞與結構連接詞，保留最具辨識度的名詞詞組。
  - 升級為「三階式通用搜尋降級 (3-Tier Fallback Search)」：精確多詞 ➔ 前二主詞 ➔ 第一核心詞廣度檢索。
- **優化時間認知與通用引導式 System Instruction**：
  - 修正過往僅強調時間基準導致模型在缺乏即時觀測數據時機械式回覆「無法連網獲取今天數據」的痛點。
  - 指示模型在面對任意即時動態/觀測提問且缺乏即時外部數值時，主動以背景知識、常態趨勢與分析建議詳實作答，並友善引導權威即時查詢管道。

### Added
- **模型代號自動容錯正規化 (Model Name Normalization)**：
  - 在 `src/Config.gs` 實作 `normalizeModelName`，自動容錯並轉換 `3.8 flash`、`3.8-flash`、`3.5-flash` 為標準 `gemini-X.X-flash` 格式，預防因空格或前綴遺漏引發的 Google HTTP 503 路由錯誤。

## [1.9.3] - 2026-10-05

### Fixed
- **徹底杜絕空白回覆與幽靈訊息 (Non-empty Guard)**：
  - 修復當觸發 Safety Filter 時，Gemini 回傳空字串但被系統誤判為 `success: true`，導致 Telegram 僅收到 `(本日已提問: 32/50)` 幽靈訊息之漏洞。
  - 在 `Main.gs` 與 `Gemini.gs` 實作嚴格非空防禦，回覆為空時明確提示安全防護警語，不再送出空訊息。
- **徹底根除多輪對話歷史污染 (Anti-Cache Poisoning)**：
  - 嚴格禁止將空白回覆寫入 `CacheService` 短期對話快取。
  - 在讀取歷史與組裝 API contents 前，全面過濾所有空回覆輪次，徹底解決「下一輪提問將前一輪空白問題合併一起回答」的混亂現象。
- **放寬安全過濾門檻至 `BLOCK_ONLY_HIGH`**：
  - 將 HARM 類別閾值自 `BLOCK_MEDIUM_AND_ABOVE` 調降至 `BLOCK_ONLY_HIGH`，避免合法的大學校園課程與教師評價詢問被誤殺為騷擾。

### Added
- **無效模型自動備援降級重試 (Model Auto-Fallback)**：
  - 當使用者在屬性設定了不存在或尚未開放之模型（如 `3.8-flash`）導致 Google 回傳 HTTP 503 / 404 時，系統不再直接中斷報錯，而是自動切換為預設穩定模型 (`gemini-2.5-flash`) 重新取得答案，並於文末友善提醒用戶。

## [1.9.2] - 2026-10-05

### Added
- **上下文代名詞主詞自動補全 (Coreference Resolution)**：
  - 解決追問「這位老師在 Dcard 評價」時代名詞指代失真之痛點。系統自動回溯上一輪對話，將「東華大學 陳文盛」核心實體自動補全至搜尋詞，生成精準查詢。
- **嚴格相關性過濾機制 (Relevance Verification)**：
  - 逐一校驗抓取到的新聞標題與摘要是否真正包含主詞實體關鍵詞。
  - 若搜尋結果與提問主體無關（例如搜出「銘傳大學」、「兒童英文」），系統自動判定為無效雜訊並全數剔除，**回覆末尾絕對不貼無關來源連結**，徹底杜絕張冠李戴現象。

## [1.9.0] - 2026-10-05

### Added
- **即時狀態反饋系統 (Progressive Status Feedback)**：
  - 封裝 Telegram `editMessageText` API，實現訊息原地動態切換。
  - 使用者發送訊息後 **0.5 秒內即時收到狀態通知**（`🔍 正在檢索即時資料中...` 或 `⏳ 收到問題，AI 思考生成中...`），徹底終結「發送後不知是否成功」的盲等困擾。
  - 檢索完成時平滑過渡為 `🧠 即時資料檢索完成，正在分析彙整回答...`，生成完畢後原地變身為最終答案，體驗極致流暢且絕不洗版。
- **全域錯誤透明化機制 (Transparent Error Handling)**：
  - 徹底消滅「靜默失敗（Silent Failure）」。
  - 當遇到任何外部網路超時、API 錯誤或未預期例外時，主動將狀態訊息原地更新為「❌ 處理失敗：詳細錯誤原因」，讓使用者第一時間掌握系統狀態。
- **智慧標點清洗與階梯式降級搜尋 (Fallback Search)**：
  - 在 `src/WebSearch.gs` 強化關鍵字清洗，自動過濾標點符號與疑問助詞。
  - 當多詞長句初次檢索為 0 筆時，自動提煉前兩大核心實體詞進行二次精簡檢索，徹底解決人名與校名長句檢索落空問題。

### Fixed
- **修正 `doPost` 變數作用域**：補齊 `const env = getEnv()` 宣告，徹底解決 `env is not defined` 運行時錯誤。

## [1.8.0] - 2026-10-05

### Added
- **GAS 雲端原生「類 Grounding」即時資料檢索系統 (`src/WebSearch.gs`)**：
  - 繞過官方 Search Grounding 429 額度限制，完全在 GAS 免費額度內（每日 20,000 次 `UrlFetchApp`）自主抓取 Google News RSS 即時時事新聞。
  - **智慧意圖偵測**：自動比對「今天、最新、新聞、賽事、颱風、天氣、今年」等時效性關鍵詞，或透過 `/search <關鍵字>`、`/news` 指令雙軌觸發檢索。
  - **資料清洗與去雜訊**：自動去除 HTML 標籤與無效廣告，精簡內文於 1200 字以內，極致保護 Token 用量。
  - **Prompt 上下文注入與來源引注**：將檢索資訊包裝為背景資料注入當前問題，並在回覆末尾自動生成可點擊之 `🔍 即時檢索來源（GAS 雲端即時資訊）`。
  - **單元測試函式**：內建 `testCustomGrounding()`，供開發者在 GAS 編輯器直接一鍵驗證檢索效果。

## [1.7.0] - 2026-10-05

### Added
- **Search Grounding 429 智慧無縫降級機制**：
  - 當開啟 `ENABLE_GOOGLE_SEARCH` 但 Google 官方回傳 429 配額受限（免費未綁卡專案之 Search Grounding 配額為 0）時，程式**不再報錯中斷**，而是自動在背景秒移除 `tools` 降級為標準生成模式重新取得回覆。
  - 徹底解決使用者在開啟搜尋功能時頻繁收到 429 Rate Limit 錯誤訊息的問題。
- **動態真實世界時間注入 (`systemInstruction`)**：
  - 透過 System Instruction 自動向模型注入台北即時年月日時間（如 `2026年10月05日`），徹底修正 AI 因訓練截斷而將「今年」誤認作 2025 年之時間認知盲點。

## [1.6.0] - 2026-10-05

### Added
- **Google Search Grounding (即時聯網搜尋) 支援**：
  - 在 `Gemini.gs` 掛載 `google_search` 工具，賦予 AI 即時上網搜尋真實資料之能力。
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

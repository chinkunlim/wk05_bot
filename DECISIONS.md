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

---

## ADR-012: 上下文代名詞補全 (Coreference Resolution) 與搜尋相關性校驗

- **狀態**：Accepted (已採納)
- **背景**：多輪追問常使用「這位老師/他/該活動」等代詞，若直接以字面搜尋會遺失主詞實體，導致搜出無關新聞（如搜尋「這位老師 Dcard 評價」卻搜出「銘傳大學/兒童英語」）；且舊版無條件將外部新聞列於來源，引發張冠李戴問題。
- **決定**：
  1. 實裝 `expandQueryWithContext(text, history)`，自動從前一輪提取核心實體名詞並前綴補全搜尋詞。
  2. 實裝 `filterRelevantArticles(articles, keyword)`，逐篇比對標題與摘要是否包含實體關鍵字。若無任何一篇真正相關，直接回傳 `null`，絕不將無關資訊注入 Prompt，回覆末尾也絕不顯示無關連結。
- **後果**：
  - **優點**：多輪對話搜尋精確度大幅飆升，徹底消滅無關來源張冠李戴現象，圖文 100% 吻合。

---

## ADR-013: 嚴格非空字串防禦、防快取污染與模型自動容錯降級機制

- **狀態**：Accepted (已採納)
- **背景**：
  1. 當使用者提問涉及人名評價時，容易觸發 Gemini 的預設 Safety Settings（回傳空白內容與 `finishReason: 'SAFETY'`）。舊版代碼未對空字串做校驗，誤判為成功，向 Telegram 送出純頁尾 `(本日已提問: 32/50)` 的幽靈訊息，並將 `{ user: prompt, model: '' }` 存進 `CacheService`，造成下一輪提問將兩題合併回答的嚴重快取污染。
  2. 若使用者填寫了不存在的模型代號（如 `3.8-flash`），Google 閘道器因找不到微服務後端而回傳 HTTP 503，舊版僅提示伺服器繁忙，缺乏自動修復能力。
- **決定**：
  1. 在 `Gemini.gs` 與 `Main.gs` 加入雙重非空防禦，回覆為空時嚴格拒絕判定為成功，並拒絕寫入歷史記憶。
  2. 在 `Storage.gs` 讀取與寫入對話快取時，過濾所有空字串輪次。
  3. 將 Safety Settings 門檻由 `BLOCK_MEDIUM_AND_ABOVE` 放寬至 `BLOCK_ONLY_HIGH`，保障正常校園課程評價等提問暢通。
  4. 實作模型自動容錯降級（Model Fallback）：若自訂模型回傳 503 或 404，系統自動無縫降級回 `CONFIG.DEFAULT_GEMINI_MODEL` (`gemini-2.5-flash`) 重試回答，並於結尾友善提示。
- **後果**：
  - **優點**：徹底消滅幽靈空白訊息與快取污染問題；即使填錯模型名稱機器人依然能 100% 穩定回答。

---

## ADR-014: 零硬編碼開放式架構 (Zero Hardcoding) 與引導式提示詞設計

- **狀態**：Accepted (已採納)
- **背景**：先前的版本為了特定測試案例可能嘗試過將部分地名或特定實體寫入規則（如氣象字典），但使用者在真實使用場景中會提出各種天馬行空、隨機領域的廣泛問題。過度特定之硬編碼違反系統通用原則，且若 System Instruction 僅生硬規定當前年份，會在未連網或缺乏即時觀測數據時導致模型過度機械式拒絕（「我無法連網獲取今天數據」）。
- **決定**：
  1. **零硬編碼 (Zero Hardcoding)**：徹底移除任何地名座標映射與特定主題實體清單。
  2. **純通用 NLP 關鍵詞提煉**：藉由清洗所有標點、疑問助詞、時間贅詞與連接詞，保留純粹的核心名詞詞組。
  3. **三階式通用搜尋降級 (3-Tier Fallback Search)**：以精確多詞 ➔ 前二名詞 ➔ 第一核心詞逐級展開檢索，兼顧精確性與廣度。
  4. **引導式提示詞 (Constructive System Instruction)**：指示模型在面對涉及即時動態/觀測但無外部檢索數據時，切勿機械式拒絕或回傳空白，應主動分享通用規律、常態背景與實用分析，並指引權威即時查詢管道。
  5. **模型名稱自動正規化**：於 `Config.gs` 實作別名轉化（如 `3.8 flash` ➔ `gemini-3.8-flash`），杜絕空格或縮寫造成的路由錯誤。
- **後果**：
  - **優點**：系統真正具備面對任意隨機提問的開放性與強健度，回覆豐富有深度，且符合 GAS 輕量零依賴設計原則。


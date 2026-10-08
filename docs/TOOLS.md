# 自訂工具庫規範與介面定義 (Tools & Interfaces Specification)

本文件定義本專案各核心模組之函式簽名（Signatures）、參數型別、回傳格式與邊界異常處理規範。

---

## 1. 檢索與爬蟲模組 (`src/WebSearch.gs`)

### `fetchLatestWebInfo(query, contextHistory)`
- **功能**：整合 Google News RSS 抓取外部即時資訊，並進行標點清洗、上下文指代消歧義與相關性過濾。
- **參數**：
  - `query` (`string`): 使用者輸入的搜尋查詢字串（如 `/search 台灣亞運金牌數` 或自然語言問題）。
  - `contextHistory` (`Array<Object>`): 近期多輪對話歷史物件陣列，用於代名詞消歧補全。
- **回傳**：
  - `string | null`: 結構化之 `【即時外部檢索資料】` Markdown 字串，包含新聞摘要與來源連結；若檢索無果則回傳 `null`。
- **關鍵內部函式**：
  - `expandQueryWithContext(query, contextHistory)`: 透過歷史記憶補全「這位老師」、「這本書」等代名詞實體。
  - `filterRelevantArticles(articles, query)`: 提取查詢之 2-gram 雙字詞素，精確過濾不相關噪音，防止來源張冠李戴。

---

## 2. 大語言模型模組 (`src/Gemini.gs`)

### `generateGeminiContent(userMessage, customGrounding, history)`
- **功能**：封裝 Google Gemini API（預設 `gemini-flash-latest`），串接多輪歷史並發起生成請求。
- **參數**：
  - `userMessage` (`string`): 當前輪次使用者提問內容。
  - `customGrounding` (`string | null`): 爬蟲模組所提取之即時新聞外部 Context。
  - `history` (`Array<Object>`): `CacheService` 中儲存的歷史對話內容。
- **回傳**：
  - `Object`:
    ```json
    {
      "text": "生成的完整回答內容 (Markdown/HTML 格式)",
      "promptTokens": 142,
      "candidateTokens": 380,
      "totalTokens": 522
    }
    ```
- **容錯與重試機制**：
  - **429 Rate Limit**：自動觸發 2.5 秒指數退避冷卻重試。
  - **404 / 503 端點錯誤**：自動將自訂模型別名平滑降級為 `CONFIG.DEFAULT_GEMINI_MODEL` (`gemini-flash-latest`)。

---

## 3. 配額與存取控制模組 (`src/QuotaManager.gs`)

### `isUserAllowed(userId)`
- **功能**：檢查傳送訊息之 Telegram User ID 是否存在於 `ALLOWED_USER_IDS` 白名單中。
- **回傳**：`boolean`（`true`: 允許訪問；`false`: 拒絕訪問）。

### `checkAndIncrementDailyQuota(userId)`
- **功能**：讀取並原子增加該使用者今日的 API 呼叫計數器。
- **鍵值格式**：`QUOTA_YYYY-MM-DD_<userId>`（依據台北時區 `Asia/Taipei` 每日歸零）。
- **回傳**：
  ```json
  {
    "allowed": true,
    "currentCount": 61,
    "limit": 75,
    "remaining": 14
  }
  ```

---

## 4. Telegram 通訊模組 (`src/Telegram.gs`)

### `sendTelegramMessage(chatId, text, options)`
- **功能**：發送訊息至指定的 Telegram 聊天視窗。
- **限制與保障**：超過 4096 字元自動切段分頁；若 HTML 解析報錯，自動降級為純文字重發。

### `editTelegramMessage(chatId, messageId, text, options)`
- **功能**：原地修改已發送之訊息（`editMessageText` API）。
- **應用情境**：實現「收到提問 ➔ 檢索中 ➔ 思考中 ➔ 最終解答」之原地動態進度反饋，不干擾聊天畫面。

---

## 5. 儲存與日誌模組 (`src/Storage.gs`)

### `logConversationToSheet(logData)`
- **功能**：在 Google 試算表底端追加一筆完整對話紀錄。
- **寫入欄位**：
  `[時間戳, User ID, 使用者姓名, 指令/類型, 提問內容, 回覆內容, Prompt Tokens, Completion Tokens, Total Tokens]`

### `getUserConversationHistory(userId)` / `saveUserConversationHistory(userId, history)`
- **功能**：調用 `CacheService.getScriptCache()` 序列化與反序列化近期 4 輪對話快取（保留時間 21600 秒 / 6 小時）。

# 系統全域背景知識庫 (System Context for AI Agents)

本文件專供接手此專案的 AI Agents、Code Reviewers 與架構師快速建立全域領域認知與關鍵約束守則。

---

## 🎯 專案使命與背景

在 AI 應用開發中，學生與獨立開發者面臨兩大核心痛點：
1. **維護伺服器成本高**：傳統 Bot 需要 VPS 主機（如 AWS EC2 / GCP Compute Engine / Render / Heroku），面臨停機維護、網址過期與信用卡扣款風險。
2. **API 費用與限速失控**：開放式 Bot 若無權限管控，極易遭爬蟲掃描惡意刷量；且免費用量（如 Gemini API 15 RPM 限速）極易觸發 HTTP 429 崩潰。

本專案由「AI Vibe Coding」期中成果出發，旨在打造一個**「零常駐主機費、零推播費、零相依性（Zero Dependency）」且具備「商用級防護力」的對話助理**。

---

## 🔒 關鍵工程鐵律 (Non-Negotiable Constraints)

1. **100% 雲端原生 (Serverless)**：
   - 核心代碼必須能在 Google Apps Script (GAS) 獨立運行。
   - 禁止引入需要本地常駐伺服器（Express / Flask / FastAPI）的依賴。
2. **零依賴 (Zero Dependency) 原則**：
   - 程式碼使用原生 JavaScript (GAS V8 語法)。
   - 網路請求必須使用 `UrlFetchApp.fetch`，不使用 npm 安裝的 `axios` 或 `node-fetch`。
   - 儲存操作使用 `PropertiesService`、`SpreadsheetApp` 與 `CacheService`。
3. **配額安全優先 (Quota Safety First)**：
   - 任何呼叫 Gemini API 的行為，**必須先通過白名單檢查與每日計數檢查**。
   - 絕不能讓未授權的使用者消耗 API 額度。
4. **零硬編碼 (Zero Hardcoding)**：
   - 禁止將任何特定專有名詞（如「東華大學」、「陳文盛」）或 API Token 硬編碼於核心業務邏輯中。
   - 所有查詢過濾必須採用通用的斷詞、2-gram 詞素抽取與正規化演算法。
5. **原地動態更新 (In-place Dynamic Status Update)**：
   - 避免連續發送「收到」、「檢索中」、「已完成」多則訊息洗版使用者視窗。
   - 必須透過 Telegram `editMessageText` 於同一則訊息中平滑演進狀態。

---

## 🧭 重要環境常數與屬性對照表

所有機密資訊均存放於 Google Apps Script 的「指令碼屬性 (Script Properties)」：

| 屬性名稱 (Key) | 說明與格式 | 範例值 |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API 訪問權杖 | `123456789:ABCdefGhIJKlmNoPQRstuvwx` |
| `GEMINI_API_KEY` | Google AI Studio Gemini API 金鑰 | `AIzaSyD...` |
| `ALLOWED_USER_IDS` | 逗點分隔的允許使用者 ID 白名單 | `12345678,87654321` |
| `GEMINI_MODEL` | 自訂或指定之 Gemini 模型代號 | `gemini-flash-latest` 或 `gemini-2.5-flash` |
| `MAX_DAILY_REQUESTS` | 每位使用者每日提問上限（選填，預設 75） | `75` |
| `TIMEZONE` | 日誌與計數歸零基準時區（選填，預設 Asia/Taipei） | `Asia/Taipei` |

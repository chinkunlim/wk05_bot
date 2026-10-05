# AGENTS.md - Developer & AI Agent Guidelines

本文件為未來接手或維護此專案的 AI Agents 與開發者提供架構規範、程式碼慣例與維護原則。

---

## 1. 專案願景與核心原則

- **100% 雲端原生 (Serverless)**：核心邏輯必須能在 Google Apps Script (GAS) 平台上獨立執行，禁止引入需要本地常駐伺服器或本地端 Node/Python Runtime 的依賴。
- **保護使用者的免費用量 (Quota Safety First)**：
  - 任何觸發外部 LLM (Gemini) API 的行為，**必須先通過白名單檢查與配額計數檢查**。
  - 絕不能讓未授權的使用者消耗 API 額度。
- **Container-Bound 設計優先**：
  - 試算表操作預設透過 `SpreadsheetApp.getActiveSpreadsheet()`，維持零 ID 配置的直覺體驗。
- **無依賴 (Zero Dependency) 原則**：
  - 程式碼全部使用原生 JavaScript (GAS V8 引擎相容語法)。
  - 網路請求必須使用 `UrlFetchApp.fetch`，不使用需 npm 安裝的 `axios` 或 `node-fetch`。
  - 快取操作使用 `CacheService`，敏感金鑰使用 `PropertiesService.getScriptProperties()`。

---

## 2. 模組分工與職責劃分

| 檔案路徑 | 職責定義 | 規範與限制 |
| :--- | :--- | :--- |
| `src/Config.gs` | 設定與腳本屬性讀取 | 不寫死任何金鑰；只在此處定義全域常數與 `getEnv()` 屬性映射；支援動態 `GEMINI_MODEL`。 |
| `src/Telegram.gs` | Telegram API 通訊 | 發送訊息必須考慮 4096 字元上限，並包含 HTML 格式解析錯誤的降級機制；封裝 Webhook 管理輔助函式與 `editMessageText` 動態狀態更新。 |
| `src/WebSearch.gs` | 雲端原生類 Grounding 檢索 | 透過 `UrlFetchApp` 抓取 Google News RSS，支援標點清洗、代名詞指代消歧義 (`expandQueryWithContext`) 與無關來源過濾 (`filterRelevantArticles`)。 |
| `src/Gemini.gs` | Gemini API 串接 | 負責組裝多輪對話歷史，解析 `usageMetadata`，並處理 429、404 或安全防護過濾等例外；內建 `listGeminiModels()` 供快速偵測可用模型。 |
| `src/QuotaManager.gs`| 存取控制與配額計數 | 以 `QUOTA_YYYY-MM-DD_userId` 為鍵存入 `ScriptProperties`，日期必須配合時區。 |
| `src/Storage.gs` | 試算表日誌與快取 | 處理表頭初始化、行資料追加，以及與 `CacheService` 溝通的上下文序列化與反序列化。 |
| `src/Main.gs` | 請求分派與指令路由 | 包含 `doPost` 與 `doGet`，嚴格執行身分檢驗 ➔ 指令解析 ➔ 漸進式狀態通知 ➔ 呼叫 Gemini ➔ 日誌寫入的流水線。 |

---

## 3. 程式碼編寫規範

### 3.1 Google Apps Script 環境限制
1. **無 Node.js 內建模組**：不可使用 `require('fs')`、`process.env` 或 `path` 等 Node 原生 API。
2. **全域命名空間共用**：在 GAS 中，所有 `.gs` 檔案中的頂層函式與常數皆共處於全域命名空間，因此函式命名應具備描述性，避免命名衝突（如使用 `sendTelegramMessage` 而非單純的 `send`）。
3. **金鑰安全性**：禁止將使用者的 Token 或 API Key 硬編碼於程式碼中提交至 Git。所有敏感資訊一律透過 `PropertiesService.getScriptProperties()` 讀取。

### 3.2 錯誤處理規範
- 外部 API 呼叫 (`UrlFetchApp.fetch`) 必須設定 `{ muteHttpExceptions: true }`，並主動檢查 HTTP 狀態碼與回傳內容，避免未處理的 HTTP 異常中斷腳本執行。
- `doPost` 必須以 `try ... catch` 包覆整個處理邏輯，確保在任何非預期錯誤發生時，仍回傳有效的 `ContentService` 回應，防止 Telegram 伺服器因為連線中斷而反覆重試發送相同訊息。

---

## 4. 如何擴充與維護功能

### 4.1 新增 Telegram 指令 (如 `/weather` 或 `/clear`)
1. 在 `src/Main.gs` 的 `switch (command)` 中新增對應的 `case '/your_command':`。
2. 撰寫對應的處理邏輯或呼叫專屬函式。
3. 於 `src/Main.gs` 的 `/help` 與 `/start` 回覆文字中同步更新該指令介紹。
4. 更新 `README.md` 中的「Telegram 機器人指令一覽」表格。
5. 於 `CHANGELOG.md` 中記錄新指令功能。

### 4.2 升級或替換 Gemini 模型
1. **查詢可用模型**：在 GAS 編輯器執行 `listGeminiModels()`，查看當前 API Key 支援的所有模型代號。
2. **後台變更**：前往「專案設定 ➔ 指令碼屬性」，修改 `GEMINI_MODEL` 為新代號即可，無需修改程式碼！
3. 若要變更預設備援模型，可修改 `src/Config.gs` 的 `CONFIG.DEFAULT_GEMINI_MODEL`。
4. 在 GAS 編輯器中執行 `testGeminiApi()` 驗證新模型的可用性。
5. 同步記錄於 `DECISIONS.md` 與 `CHANGELOG.md`。

---

## 5. 本地端驗證流程

在對本機端代碼進行修改後，可透過 Node.js 快速檢查 JavaScript 語法是否符合規範：

```bash
node -e "
const fs = require('fs');
const vm = require('vm');
const files = ['Config.gs', 'Telegram.gs', 'WebSearch.gs', 'Gemini.gs', 'QuotaManager.gs', 'Storage.gs', 'Main.gs'];
for (const file of files) {
  const code = fs.readFileSync('src/' + file, 'utf8');
  new vm.Script(code, { filename: file });
  console.log('✅ ' + file + ' 語法通過');
}
"
```

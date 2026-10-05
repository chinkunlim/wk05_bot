# 🤖 Serverless AI 智慧對話助理 Bot (第一版)

> **期中專題 第一版作業成果**
> - 📄 **專題計畫書**：[專題計畫書_AI智慧助理Bot第一版.pdf](專題計畫書_AI智慧助理Bot第一版.pdf)
> - 📊 **專題簡報**：[專題簡報_AI智慧助理Bot第一版.pdf](專題簡報_AI智慧助理Bot第一版.pdf)
> - 🌐 **開發紀錄網頁**：[index.html (含實測證明專區)](https://chinkunlim.github.io/wk05_bot/)
> - 🔍 **實測證明章節**：位於開發紀錄網頁的 **【第 5 章：實測證明與對話成果展示 (#proof-of-testing)】**
> - 📦 **GitHub 專案**：[https://github.com/chinkunlim/wk05_bot](https://github.com/chinkunlim/wk05_bot)

---


## 🌟 核心特色

- ⚡ **100% 純雲端免主機**：不需要任何本地電腦環境或雲端 VPS，本機關機機器人照常 24/7 運作。
- 🔍 **內建模型自動偵測 (`listGeminiModels`)**：一鍵向 Google API 查詢您金鑰目前支援的所有最新模型清單，不需擔心官方型號更迭或版本退場！
- 🎛️ **模型隨選即用**：支援在「指令碼屬性」填寫 `GEMINI_MODEL`，日後推出新模型免改任何程式碼即可直接升級。
- 🛡️ **額度安全三重防護**：
  - **白名單授權**：只有指定的 Telegram User ID 才能向 Gemini 提問，未授權者會被禮貌拒絕，防止外人惡意刷額度。
  - **每日次數上限**：自訂每日最大呼叫次數（預設 50 次），超過即時攔截，徹底杜絕意外帳單與額度爆表。
  - **Flash 系列最佳化**：兼具快速回應、極低延遲與寬裕的 Free Tier 容許度。
- 🧠 **短期上下文對話記憶**：能自然記憶最近 4 輪對話脈絡，支援連續追問；提供 `/reset` 隨時開啟新主題。
- 📊 **Google 試算表自動記帳**：提問時間、使用者 ID/名稱、問題、回答、Prompt/Output/Total Tokens 與當日累計次數全自動記載。
- 🖱️ **零終端機一鍵雲端設定**：程式碼內建 Webhook 管理函式，在瀏覽器網頁點擊「執行」即可完成 Telegram Webhook 綁定，不用打任何 curl 指令。

---

## 📋 準備工作

在開始部署前，請準備以下三樣資訊：

1. **Telegram Bot Token**：
   - 在 Telegram 搜尋 `@BotFather` 並傳送 `/newbot`，依提示命名後即可取得一組 Token（例如：`123456789:ABCdefGhIJKlmNoPQRstuvwx`）。
2. **Gemini API Key**：
   - 前往 [Google AI Studio](https://aistudio.google.com/) 點擊 **Get API key** 免費建立一組 API 金鑰。
3. **您的 Telegram User ID**：
   - 可在 Telegram 搜尋 `@userinfobot` 傳送任何訊息查詢；**或者直接部署完後向您的 Bot 傳送隨意訊息，Bot 會自動回覆您的 ID**。

---

## 🚀 逐步部署安裝手冊 (純瀏覽器操作，約 5 分鐘)

### 步驟一：建立 Google 試算表
1. 打開瀏覽器，前往 [Google 試算表](https://sheets.new) 建立一張新的試算表。
2. 將試算表命名為：`Telegram Gemini Bot 問答記錄簿`（或任何您喜歡的名稱）。

### 步驟二：開啟 Google Apps Script 編輯器
1. 在試算表上方選單，點選 **「擴充功能」 (Extensions) ➔ 「Apps Script」**。
2. 系統會自動開啟 Apps Script 雲端編輯器分頁。

### 步驟三：建立程式碼分頁並貼上內容
在左側「檔案」列表中，預設會有一個 `程式碼.gs`。請依據本專案 `src/` 資料夾，建立對應名稱的檔案（點擊「檔案」旁的 `+` 號 ➔ 選擇「指令碼」）：

1. **`Config.gs`**：複製貼上本專案的 [src/Config.gs](file:///Users/limchinkun/Desktop/AI%20vibe%20coding/wk05_bot/src/Config.gs)
2. **`Telegram.gs`**：複製貼上本專案的 [src/Telegram.gs](file:///Users/limchinkun/Desktop/AI%20vibe%20coding/wk05_bot/src/Telegram.gs)
3. **`Gemini.gs`**：複製貼上本專案的 [src/Gemini.gs](file:///Users/limchinkun/Desktop/AI%20vibe%20coding/wk05_bot/src/Gemini.gs)
4. **`QuotaManager.gs`**：複製貼上本專案的 [src/QuotaManager.gs](file:///Users/limchinkun/Desktop/AI%20vibe%20coding/wk05_bot/src/QuotaManager.gs)
5. **`Storage.gs`**：複製貼上本專案的 [src/Storage.gs](file:///Users/limchinkun/Desktop/AI%20vibe%20coding/wk05_bot/src/Storage.gs)
6. **`Main.gs`**：複製貼上本專案的 [src/Main.gs](file:///Users/limchinkun/Desktop/AI%20vibe%20coding/wk05_bot/src/Main.gs)

> 💡 貼上完成後，點擊上方工具列的 **儲存專案** (磁碟片圖示，或快速鍵 `Ctrl+S` / `Cmd+S`)。

---

### 步驟四：設定「指令碼屬性」 (Script Properties)
金鑰與設定獨立儲存在安全的屬性區中：

1. 點選左側選單的 ⚙️ **「專案設定」 (Project Settings)**。
2. 往下滑動至 **「指令碼屬性」 (Script Properties)** 區塊，點選 **「編輯指令碼屬性」** ➔ **「新增指令碼屬性」**，依序新增以下屬性：

| 屬性名稱 (Property) | 範例值 (Value) | 說明 |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | `123456789:ABCdefGhI...` | 向 @BotFather 取得的 Bot Token |
| `GEMINI_API_KEY` | `AIzaSyD...` | 向 Google AI Studio 取得的 API Key |
| `GEMINI_MODEL` | *(可先不填或填目前可用模型)* | 指定模型代號（如 `gemini-2.0-flash`、`gemini-2.5-flash` 或 `gemini-3.5-flash`） |
| `ALLOWED_USER_IDS` | `12345678,87654321` | 允許使用者的 Telegram User ID (多個以逗號隔開) |
| `MAX_DAILY_REQUESTS` | `50` | 每日提問次數上限（預設 50） |
| `ENABLE_GOOGLE_SEARCH` | `true` | 是否啟用即時 Google 搜尋資料（預設 `true`，設為 `false` 關閉） |

3. 點擊 **「儲存指令碼屬性」**。

> 💡 **如何確認目前有哪些模型可用？**
> 1. 切換回左側「＜＞ 編輯器」，打開 `Gemini.gs`。
> 2. 在上方函式下拉選單中，選擇 **`listGeminiModels`** 並點擊「執行」。
> 3. 下方的執行記錄會自動印出您當前金鑰可用之所有模型代號！
> 4. 挑選含有 `flash` 的代號（例如 `gemini-2.0-flash` 或最新版），回到指令碼屬性填入 `GEMINI_MODEL` 即可。

---

### 步驟五：部署為網頁應用程式 (Web App)
1. 點擊右上角藍色按鈕 **「部署」 (Deploy) ➔ 「新增部署作業」 (New deployment)**。
2. 點擊齒輪圖示 ⚙️，選擇類型為 **「網頁應用程式」 (Web app)**。
3. 填寫部署設定：
   - **說明**：`v1.0 Telegram Bot`
   - **執行身分 (Execute as)**：選擇 **「我」 (Me)**
   - **誰可以存取 (Who has access)**：務必選擇 **「所有人」 (Anyone)** *(Telegram 伺服器才能發送 Webhook)*
4. 點擊 **「部署」**。
5. 若首次執行出現「需要授權」提示：
   - 點擊「審查權限」➔ 選擇您的 Google 帳號 ➔ 點擊「進階 (Advanced)」➔ 點選「前往 (不安全)」➔ 點擊「允許」。
6. 部署完成後，複製畫面上顯示的 **「網頁應用程式網址」 (Web App URL)**（網址形式如：`https://script.google.com/macros/s/AKfycb.../exec`）。

---

### 步驟六：將網址存入屬性並「一鍵綁定 Webhook」
1. 回到 **「專案設定」** ➔ **「指令碼屬性」**，新增或編輯：
   - 屬性名稱：`WEBHOOK_URL`
   - 屬性值：貼上剛剛複製的「網頁應用程式網址」
   - 儲存屬性。
2. 切換回左側的 **「＜＞ 編輯器」**，開啟 `Telegram.gs`。
3. 在上方選單的函式下拉清單中，選擇 **`setupTelegramWebhook`**。
4. 點擊旁邊的 **「執行」** (Run) 按鈕。
5. 下方的「執行記錄」應會顯示：`📡 Webhook 設定結果: {"ok":true,"result":true,"description":"Webhook was set"}`！🎉

---

### 步驟七：初始化試算表並開始測試！
1. 在上方函式下拉選單中，選擇 **`initSheetHeader`**，點擊 **「執行」**。
2. 回到您的 Google 試算表，會看到已自動建立了美觀的「問答日誌」表頭！
3. 打開 Telegram，向您的機器人傳送 `/start` 或任何問題，例如：
   - 傳送：「你好，我是小明！」
   - 傳送：「我的名字是什麼？」➔ 機器人將依據上下文回答「您的名字是小明！」
   - 回到 Google 試算表，對話與 Token 數量已經自動即時記錄完成！

---

## 💬 Telegram 機器人指令一覽

| 指令 | 說明 |
| :--- | :--- |
| `/start` | 顯示歡迎訊息與功能簡介 |
| `/search <關鍵字>` | 即時檢索 Google News RSS 最新新聞並由 AI 總結分析 |
| `/news` | 即時檢索台灣最新新聞頭條 |
| `/status` | 查詢今日提問已用次數、剩餘次數與上限（每日午夜自動重置） |
| `/reset` | 清除短期對話上下文記憶，重啟新話題 |
| `/help` | 顯示指令操作手冊 |

---

## 📑 Google 試算表記錄欄位說明

每筆對話都會依序記錄以下欄位：
1. **時間戳記**：提問完成的確切時間（台北時間 `YYYY-MM-DD HH:mm:ss`）。
2. **使用者 ID**：發問者的 Telegram 數字 ID。
3. **使用者名稱**：Telegram 暱稱或帳號名稱。
4. **提問內容**：使用者傳送的原始問題文字。
5. **Gemini 回答**：Gemini 生成的回應文字。
6. **輸入 Tokens**：Prompt 耗費的 Token 數量。
7. **輸出 Tokens**：回覆生成的 Token 數量。
8. **總計 Tokens**：此筆請求消耗的總 Token 數。
9. **當日累計次數**：該使用者當天累計提問次數。

---

## 🛠️ 本地端專案目錄架構

```
wk05_bot/
├── src/
│   ├── Config.gs           # 屬性設定、白名單與環境變數管理
│   ├── Telegram.gs         # Telegram API 互動、長文字智慧切割與 Webhook 註冊
│   ├── Gemini.gs           # Gemini REST API 呼叫、模型清單查詢 (listGeminiModels) 與 Token 統計
│   ├── QuotaManager.gs     # 白名單判定與每日配額累積防護
│   ├── Storage.gs          # 試算表自動初始化、日誌寫入與 CacheService 快取管理
│   └── Main.gs             # Webhook 進入點 (doPost, doGet) 與指令路由
├── appsscript.json         # Apps Script 資訊清單 (V8 引擎、台北時區)
├── README.md               # 專案詳細安裝與操作手冊 (本文件)
├── DECISIONS.md            # 架構設計決策記錄 (ADR)
├── CHANGELOG.md            # 版本變更記錄 (Keep a Changelog 格式)
├── KNOW_ISSUES.md          # 已知限制與常見問題排解
└── AGENTS.md               # 專案規範與 AI Agent 維護指引
```

# Google Apps Script 雲端部署與維運手冊 (Deployment Guide)

本文件提供完整的逐步部署、金鑰設置、Telegram Webhook 註冊與線上維護指南。

---

## 🚀 逐步部署安裝流程 (純瀏覽器操作，約 5 分鐘)

### 步驟一：建立 Google 試算表容器
1. 前往 [Google 試算表 (sheets.new)](https://sheets.new) 建立一份新的試算表。
2. 命名為 `Telegram AI 智慧助理 Bot 日誌`。

### 步驟二：開啟 Apps Script 編輯器
1. 在試算表上方選單點選 **「擴充功能」 ➔ 「Apps Script」**。
2. 進入雲端程式碼編輯器。

### 步驟三：匯入程式碼檔案
點擊編輯器左側「檔案」旁邊的 **`+`** 號 ➔ 選擇「指令碼」，依序建立下列 7 個 `.gs` 檔案並貼入對應內容：
1. `Config.gs` (複製 `src/Config.gs`)
2. `Telegram.gs` (複製 `src/Telegram.gs`)
3. `WebSearch.gs` (複製 `src/WebSearch.gs`)
4. `Gemini.gs` (複製 `src/Gemini.gs`)
5. `QuotaManager.gs` (複製 `src/QuotaManager.gs`)
6. `Storage.gs` (複製 `src/Storage.gs`)
7. `Main.gs` (複製 `src/Main.gs`)

### 步驟四：設定指令碼屬性 (Script Properties)
1. 點擊左側側邊欄齒輪圖示 **「專案設定」 (Project Settings)**。
2. 向下滾動至 **「指令碼屬性」 (Script Properties)** 區塊。
3. 點擊 **「新增指令碼屬性」**，依序新增以下鍵值：
   - `TELEGRAM_BOT_TOKEN`: 您的 Telegram Bot Token（向 `@BotFather` 取得）
   - `GEMINI_API_KEY`: 您的 Gemini API Key（向 Google AI Studio 取得）
   - `ALLOWED_USER_IDS`: 您的 Telegram User ID（可透過 `@userinfobot` 取得）
   - `GEMINI_MODEL`: `gemini-flash-latest`（推薦官方穩定別名）
4. 點擊「儲存指令碼屬性」。

### 步驟五：部署為網頁應用程式 (Deploy as Web App)
1. 點擊右上角藍色按鈕 **「部署」 ➔ 「新增部署作業」**。
2. 齒輪選單選擇 **「網頁應用程式」 (Web App)**。
3. 設定參數：
   - **說明**：`v1.9.5 Production`
   - **執行身分 (Execute as)**：`我 (您的 Google 帳號)`
   - **誰可以存取 (Who has access)**：`任何人 (Anyone)` *(務必選擇此項，Telegram 伺服器才能發送 Webhook)*
4. 點擊「部署」，首次部署需核准 Google 權限（進階 ➔ 前往專案 ➔ 允許）。
5. 複製生成的 **網頁應用程式網址 (Web App URL)**（格式如：`https://script.google.com/macros/s/AKfycb.../exec`）。

### 步驟六：註冊 Telegram Webhook
在瀏覽器網址列直接造訪下列格式之網址：
```text
https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook?url=<YOUR_WEB_APP_URL>
```
若看到回傳 JSON `{"ok": true, "result": true, "description": "Webhook was set"}` 即代表註冊成功！

---

## 🛠️ 常見維運與排錯指南

### 1. 修改代碼後機器人未生效
* **原因**：GAS Web App 綁定特定「部署版本」，單純按儲存不會更新線上線上版本。
* **解法**：點擊 **「部署」 ➔ 「管理部署作業」 ➔ 點擊鉛筆編輯 ➔ 「版本」下拉選擇「新版本」 ➔ 「部署」**。

### 2. Telegram 連續發送重複訊息（Webhook 重試風暴）
* **解法**：在 GAS 編輯器上方函式下拉選單中選擇 **`clearTelegramPendingUpdates`**，點擊「執行」，清空 Telegram 伺服器上的積壓重試佇列。

### 3. 檢查 API Key 支援的所有可用模型
* **解法**：在 GAS 編輯器執行 **`listGeminiModels()`**，在「執行記錄」中即可查看當前金鑰支援的模型清單。

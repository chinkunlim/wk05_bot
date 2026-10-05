# Known Issues & Limitations (已知限制與問題排解)

本文件列出 Google Apps Script、Telegram Bot API 與 Gemini API 在本架構下的已知平台限制、可能遭遇的情境與建議排解方案。

---

## 1. Telegram Webhook 重試風暴（Bot 一直重複發送訊息）⚠️

### 1.1 現象描述
傳送了一次 `/start` 或一個問題，機器人每隔 1~2 分鐘就瘋狂重複回覆相同的內容。

### 1.2 根本原因
Telegram 官方 Webhook 機制具備「重試政策 (Retry Policy)」：
- 當 Telegram 伺服器向 GAS 發出 Webhook POST 請求後，若 Google Apps Script 執行稍慢，或回應的格式未在短時間內被 Telegram 辨識為 200 OK，Telegram 會判定該則訊息「投遞失敗」。
- 判定失敗後，Telegram 會在接下來的幾分鐘內**自動且反覆重新投遞該則訊息**。
- 若程式碼沒有做「**訊息 ID 去重 (Deduplication)**」，每次 Telegram 重送，GAS 就會重複執行一次並發送回覆，導致回覆像鬼打牆一樣一直狂發。

### 1.3 解決方式（已在 v1.2.0 修復）
1. **立即停止狂發（清空積壓佇列）**：
   - 打開 GAS 編輯器中的 `Telegram.gs`。
   - 上方選單選擇 **`clearTelegramPendingUpdates`** 函式，點擊「**執行**」。
   - Telegram 會立刻將所有積壓在伺服器端重試佇列中的請求全部作廢，重複發訊立即停止！
2. **更新程式碼**：
   - 將最新的 `Main.gs` 與 `Telegram.gs` 複製貼到 GAS 編輯器。
   - 點擊「**部署 ➔ 管理部署作業 ➔ 編輯 ➔ 選擇新版本 ➔ 部署**」（務必發布新版本！）。
   - 最新程式碼已內建 `update_id` 快取去重，同一則訊息在 5 分鐘內絕不重複處理。

---

## 2. Google Apps Script 平台限制

### 2.1 程式碼修改後未生效
- **現象**：修改了 GAS 編輯器中的程式碼，但 Telegram 機器人回應的仍然是舊版邏輯。
- **原因**：Google Apps Script 的 Web App 網址是綁定特定「部署版本 (Version)」。直接修改程式碼並點擊儲存，不會自動覆蓋正在線上運行的部署。
- **排解方式**：
  1. 點擊 GAS 編輯器右上角「部署」按鈕。
  2. 選擇「**管理部署作業** (Manage deployments)」。
  3. 點選左側目前的 Web App，點擊右上角鉛筆圖示（編輯）。
  4. 在「版本 (Version)」下拉選單中選擇「**新版本** (New version)」。
  5. 點擊「部署」即可生效。

### 2.2 單次執行時間上限 (Execution Time Limit)
- **限制**：Google Apps Script 個人 Google 帳號單次腳本執行上限為 **6 分鐘**。
- **影響評估**：Gemini Flash 回應一般文字問答平均耗時 1~3 秒，遠低於上限。

### 2.3 UrlFetchApp 每日呼叫上限
- **限制**：免費個人 Google 帳號每日 `UrlFetchApp` 請求次數上限為 20,000 次。

---

## 3. Gemini API 限制與應對

### 3.1 模型版本停用或不存在 (HTTP 404)
- **現象**：提問後機器人回覆：`❌ 模型「xxx」不存在或已停用 (HTTP 404)。`
- **排解方式**：
  1. 打開 Google Apps Script 編輯器，切換至 `Gemini.gs`。
  2. 在頂端函式下拉選單選擇 **`listGeminiModels`** 並點擊「執行」。
  3. 查看執行記錄中的模型清單，複製其中一個支援的代號（例如包含 `flash` 的名稱）。
  4. 前往「專案設定 ➔ 指令碼屬性」，修改 `GEMINI_MODEL` 為該代號並儲存。

### 3.2 Free Tier 速率與用量限制 (HTTP 429)
- **官方限制 (Gemini Flash Free Tier)**：
  - **RPM (每分鐘請求數)**：15 次
  - **RPD (每日請求數)**：1,500 次
  - **TPM (每分鐘 Token 數)**：1,000,000 Tokens
- **應對機制**：程式碼中已捕捉 HTTP 429，若觸發會提示使用者稍候 1~2 分鐘。

---

## 4. Telegram API 限制與應對

### 4.1 單則訊息長度限制 (4096 字元)
- **應對機制**：本專案在 `Telegram.gs` 的 `sendTelegramMessage` 中實作了**自動智慧切割**。當 Gemini 回覆超過 4000 字元時，會尋找最近的換行處將文字分段，依序發送多則訊息。

### 4.2 HTML 標籤格式錯誤回退機制
- **應對機制**：`_sendTelegramRequest` 內建自動降級重試機制。若 HTML 格式發送失敗，會自動退回純文字模式重新發送，確保訊息絕不遺失。

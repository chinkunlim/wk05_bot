# 作業標準流程指南 (Standard Operating Procedures)

本文件提供開發、測試、部署與版本發布的完整標準作業程序 (SOP)。

---

## 🔄 SOP 1：新增功能或指令流程

1. **規劃與路由註冊**：
   - 於 `src/Main.gs` 的指令解析分支（`switch (command)`）新增對應 case。
   - 在 `src/` 中編寫專屬業務函式。
2. **語法與邏輯檢查**：
   - 於本機終端機執行 `make check-gas`。
   - 執行 `make test` 確保單元測試通過。
3. **更新使用說明與文檔**：
   - 於 `src/Main.gs` 的 `/help` 回覆清單中加入新指令說明。
   - 同步更新 `README.md` 與 `CHANGELOG.md`。

---

## 🚀 SOP 2：雲端部署與版本發布流程

1. **同步代碼至 Google Apps Script**：
   - 將本機 `src/` 各檔案內容複製至 Google Apps Script 編輯器中對應的 `.gs` 檔案。
2. **發布全新部署版本 (New Version)**：
   - 點擊 Apps Script 右上角「部署」 ➔ 「管理部署作業」。
   - 點選目前運行的部署 ➔ 點擊鉛筆（編輯） ➔ 「版本」下拉選擇「新版本」。
   - 輸入版本註解（如 `v1.9.5 Release`） ➔ 點擊「部署」。
3. **在 Telegram 進行端到端三階段驗證**：
   - 驗證正常功能（`/search` 或對話）。
   - 驗證缺參數引導（輸入空白指令）。
   - 驗證非白名單攔截或配額查詢（`/status`）。

---

## ⏪ SOP 3：緊急回滾 (Emergency Rollback)

若新版本部署後發生非預期異常：
1. **立即回滾部署版本**：
   - 前往 GAS 編輯器「部署」 ➔ 「管理部署作業」 ➔ 編輯。
   - 在「版本」選單中選擇前一個穩定的版本編號 ➔ 點擊「部署」，即可在 5 秒內瞬間回滾！
2. **清空 Telegram 重試積壓**：
   - 在 GAS 執行 `clearTelegramPendingUpdates()` 函式，防止伺服器重試風暴。

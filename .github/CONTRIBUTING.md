# 貢獻與協作指南 (Contributing Guidelines)

感謝您對本專案的關注與貢獻！為了維護專案的生產級穩定度、程式碼整潔度與雲端原生架構一致性，請遵循以下規範。

---

## 🛠️ 開發與提交流程

1. **Fork 與分支命名**：
   - 功能分支：`feat/your-feature-name`
   - 修復分支：`fix/your-bug-fix`
   - 文檔分支：`docs/your-doc-update`
2. **Git Commit 規範 (Conventional Commits)**：
   - `feat(scope): ...`：新功能
   - `fix(scope): ...`：Bug 修復
   - `docs(scope): ...`：文檔更新
   - `refactor(scope): ...`：重構代碼
   - `test(scope): ...`：測試新增或更新
3. **提交前本機驗證**：
   - 執行 `make check-gas` 確保 JavaScript / GAS 語法無誤。
   - 執行 `make test` 確保單元測試全數通過。

---

## 🔒 程式碼審查與安全性準則

- **禁止硬編碼金鑰**：絕不將 Token、API Key 或真實 User ID 提交至 Git 倉庫。
- **保持 GAS 原生性**：不引入需額外 npm 或伺服器 runtime 的外部依賴。

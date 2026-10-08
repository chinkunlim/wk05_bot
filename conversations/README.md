# 專案對話溯源儲存庫 (Conversations Repository)

本目錄存放本專案所有透過 AI Agent（如 Antigravity / Claude / Cursor 等）進行人機協同開發、架構除錯與功能演進的完整對話歷史與結構化摘要。

---

## 📂 目錄架構

```
conversations/
├── README.md               # 本索引說明文件
├── raw/                    # 完整原始對話 Markdown 記錄 (完整問答、提示詞、附件名稱與推論歷程)
│   └── 001_development_and_debugging.md
└── summaries/              # 每次會話對應的獨立摘要報告 (關鍵決策、Bug 修復、測試紀錄與成果)
    └── 001_development_and_debugging_summary.md
```

---

## 📑 對話歷程索引表

| 編號 | 對話主題 | 原始紀錄 (`raw/`) | 結構摘要 (`summaries/`) | 關鍵技術里程碑 |
| :---: | :--- | :--- | :--- | :--- |
| **001** | 全流程開發、2-gram 檢索修復、429 退避與 PDF 渲染優化 | [`001_development_and_debugging.md`](raw/001_development_and_debugging.md) | [`001_development_and_debugging_summary.md`](summaries/001_development_and_debugging_summary.md) | • 修復 Google News 相關性過濾誤殺<br>• 補回 fetchLatestWebInfo return<br>• 實作 429 RPM 指數退避與 404/503 自動備援<br>• 根治 PDF -webkit-background-clip 漸變白框<br>• Mac M6 獨立 profile 渲染防卡 |

---

## 📝 命名與維護規範

未來每次進行重構或新功能開發對話時，請依序以 3 位數流水號編號：
1. **原始記錄**：存放於 `raw/XXX_<topic_name>.md`
2. **結構摘要**：存放於 `summaries/XXX_<topic_name>_summary.md`
3. 於上方「對話歷程索引表」追加新紀錄，確保人機協同溯源透明可追溯。

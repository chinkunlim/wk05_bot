# 系統架構設計與服務架構圖 (System Architecture)

本專案採用 **100% 雲端原生 (Serverless)** 設計，以 Google Apps Script (GAS) 作為核心運算層，全面整合 Telegram Bot API、Google Gemini API、Google News RSS 即時爬蟲以及 Google 試算表（Google Sheets）作為持久化日誌儲存庫，達成 0 主機成本、24/7 常駐在線與雙重額度安全保護的生產級架構。

---

## 🏛️ 全域架構拓撲圖

```mermaid
flowchart TD
    User(["👤 Telegram 使用者"])
    TG_Server["☁️ Telegram Cloud Server"]
    GAS_Webhook["⚙️ Google Apps Script (GAS Webhook / doPost)"]
    Quota["🛡️ QuotaManager (白名單 & 每日額度)"]
    Storage["📊 Storage (Google Sheets & CacheService)"]
    WebSearch["🌐 WebSearch (Google News RSS 爬蟲 & 2-gram 過濾)"]
    Gemini["🧠 Gemini API (gemini-flash-latest)"]
    
    User -->|"發送文字 / 指令"| TG_Server
    TG_Server -->|"HTTPS POST Webhook"| GAS_Webhook
    
    subgraph Core_Runtime ["Google Apps Script (V8 Engine)"]
        GAS_Webhook --> Quota
        Quota -->|"白名單通過 & 額度充足"| MainRouter["Main 指令路由分派"]
        MainRouter -->|"秒級動態回饋 (editMessageText)"| TG_Server
        MainRouter --> WebSearch
        WebSearch -->|"注入 Context 提示詞"| Gemini
        Gemini -->|"串接多輪歷史"| Storage
        MainRouter -->|"記錄 Token & 對話日誌"| Storage
    end
    
    Gemini -->|"最終答案生成"| TG_Server
    TG_Server -->|"即時渲染 Markdown/HTML"| User
```

---

## 🔄 詳細端到端資料流 (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor User as 使用者 (Telegram)
    participant TG as Telegram 伺服器
    participant GAS as GAS WebApp (Main.gs)
    participant Quota as QuotaManager
    participant Search as WebSearch.gs
    participant Gemini as Gemini API
    participant Sheet as Google Sheets

    User->>TG: 發送訊息 (如: /search 台灣亞運金牌數)
    TG->>GAS: Webhook HTTP POST (JSON Payload)
    
    GAS->>Quota: 1. 白名單檢驗 (ALLOWED_USER_IDS)
    alt 非白名單
        Quota-->>GAS: 攔截 (403 Unauthorized)
        GAS->>TG: 回覆拒絕存取與 User ID
    else 白名單通過
        GAS->>Quota: 2. 檢查每日額度 (QUOTA_YYYY-MM-DD_userId)
        alt 超過配額 (75次)
            Quota-->>GAS: 阻擋超額
            GAS->>TG: 回覆本日額度已用罄提示
        else 額度許可
            GAS->>TG: 0.5 秒秒級回報狀態: 收到提問，檢索中...
            GAS->>Search: 觸發 Google News RSS 檢索
            Search-->>GAS: 2-gram 柔性抽取 4 篇新聞 Context
            GAS->>TG: 原地編輯訊息: 檢索完成 (4篇)，分析中...
            GAS->>Gemini: 組合 System Prompt + Context + 歷史紀錄
            Gemini-->>GAS: 生成結構化回答 (含 Yahoo/CNA 超連結)
            GAS->>TG: 原地更新為最終解答
            GAS->>Sheet: 追加時間戳、使用者、Token消耗、提問與回答
        end
    end
```

---

## 🧩 核心模組職責劃分

| 模組路徑 | 模組名稱 | 職責與關鍵技術 |
| :--- | :--- | :--- |
| `src/Config.gs` | 設定與金鑰管理 | 封裝 `PropertiesService`，動態解析 `GEMINI_MODEL`、白名單與環境常數，徹底杜絕硬編碼。 |
| `src/QuotaManager.gs` | 存取控制與配額安全 | 實作雙重額度防禦：嚴格白名單攔截 + 每日計數器（`ScriptProperties`），保護免費用量不被爆破。 |
| `src/WebSearch.gs` | 雲端原生檢索 (Grounding) | 透過 `UrlFetchApp` 抓取 Google News RSS，支援地域前綴剝除與 2-gram 雙字核心詞素過濾，突破訓練截止期。 |
| `src/Gemini.gs` | LLM 大腦與對話上下文 | 組合多輪對話快取、System Prompt 與 Grounding Context；實作 429 退避重試與 404/503 自動備援模型降級。 |
| `src/Telegram.gs` | Telegram Bot 通訊 | 封裝 `sendMessage`、`editMessageText` 原地狀態動態變更、4096 字元自動分頁與 HTML/Markdown 解析降級。 |
| `src/Storage.gs` | 日誌持久化與快取 | 處理試算表自動初始化表頭與追加日誌（包含 Prompt/Completion Tokens），並調用 `CacheService` 維護短期對話記憶。 |
| `src/Main.gs` | Webhook 進入點與路由器 | 實作 `doPost` 與 `doGet`，統一控管身分檢驗 ➔ 指令解析 ➔ 原地回饋 ➔ 模型推論 ➔ 日誌寫入之全流程。 |

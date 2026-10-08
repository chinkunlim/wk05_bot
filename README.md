# 🤖 Serverless AI 智慧對話助理 Bot (課後改善版 v1.9.5)

> **課後作業改善版成果（保留第一版 commit 並完成實測突破）**
> - 📊 **成果簡報 PDF**：[TelegramBot-AI智慧助理Bot改善版-成果簡報.pdf](TelegramBot-AI智慧助理Bot改善版-成果簡報.pdf)
> - 📄 **第一版專題計畫書**：[專題計畫書_AI智慧助理Bot第一版.pdf](專題計畫書_AI智慧助理Bot第一版.pdf)
> - 🌐 **開發紀錄網頁**：[index.html (含改善版成果與實測證明)](https://chinkunlim.github.io/wk05_bot/)
> - 🔍 **改善版實測證明**：位於開發紀錄網頁的 **【第 6 章：課後改善版 (v1.9.5) 核心突破與重新測試專區 (#improvement)】** 與第 5 章
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
├── .python-version              # 鎖定 Python Runtime (3.11.10)
├── pyproject.toml               # uv / pytest / ruff 專案設定與依賴
├── uv.lock                      # uv 精準依賴鎖定檔
├── .gitignore                   # Git 排除清單 (.venv, .env, __pycache__)
├── .env.example                 # 雲端 Script Properties 環境變數範本
├── Makefile                     # 一鍵常用指令 (make test, make check-gas, make render-pdf)
├── LICENSE                      # MIT 開源授權條款
├── appsscript.json              # Apps Script 資訊清單 (V8 引擎、台北時區)
│
├── .vscode/                     # VS Code 開發環境配置
│   ├── settings.json            # 格式化、縮排與 Python 直譯器綁定
│   └── launch.json              # 測試與除錯啟動組態
├── .cursorrules                 # AI Agent / Cursor 專案編程規範與架構鐵律
│
├── .github/                     # GitHub 雲端自動化與協作治理規範
│   ├── workflows/
│   │   └── ci.yml               # GitHub Actions CI 自動化流水線
│   ├── CONTRIBUTING.md          # 貢獻與 PR 提交指南
│   └── SECURITY.md              # 資安通報政策與金鑰外洩防護
│
├── README.md                    # 專案入口快速上手文件 (本文件)
├── AGENTS.md                    # Agent 角色定義、職責權限與協作協定
├── WORKFLOW_GUIDE.md            # 標準作業程序 (SOP：開發、部署、發布與回滾)
├── CHANGELOG.md                 # 版本變更記錄 (v1.0 ~ v1.9.5)
├── DECISIONS.md                 # 架構重大決策記錄 (ADR-001 ~ ADR-015)
├── KNOWN_ISSUES.md              # 已知問題、除錯避障與平台選型分析
│
├── src/                         # 雲端原生應用程式核心原始碼 (Google Apps Script)
│   ├── Config.gs                # 屬性設定、白名單與環境變數管理
│   ├── Telegram.gs              # Telegram API 互動、長文字智慧切割與 editMessageText
│   ├── WebSearch.gs             # 雲端原生類 Grounding 即時檢索、2-gram 柔性詞素過濾
│   ├── Gemini.gs                # Gemini REST API 串接、429 退避與 404/503 自動備援
│   ├── QuotaManager.gs          # 白名單判定與每日配額累積防護
│   ├── Storage.gs               # 試算表自動初始化、日誌寫入與 CacheService 快取管理
│   └── Main.gs                  # Webhook 進入點 (doPost, doGet)、漸進式動態回饋與指令路由
│
├── docs/                        # 深度架構文檔與 GitHub Pages 展示網頁
│   ├── ARCHITECTURE.md          # 系統架構拓撲圖與服務時序圖
│   ├── TOOLS.md                 # 自訂工具庫規範與介面定義
│   ├── CONTEXT.md               # 系統全域背景 (專供 Agent 快速吸收)
│   ├── DEPLOYMENT.md            # Google Apps Script 雲端部署與維運手冊
│   ├── PROMPT_TEMPLATES.md      # 提示詞範本與調教手冊
│   ├── index.html               # 開發紀錄展示網頁 (GitHub Pages 部署檔)
│   ├── slides.html              # 成果簡報 16:9 HTML 原始碼 (純向量、0豆腐塊)
│   ├── plan.html                # 專題計畫書 A4 HTML 原始碼
│   └── assets/                  # 實測截圖與素材庫 (proof_01 ~ proof_22)
│
├── reports/                     # 專題成果報告與簡報歸檔
│   ├── TelegramBot-AI智慧助理Bot改善版-成果簡報.pdf # 課後改善版簡報 PDF (16:9)
│   ├── LINEBot-AI智慧助理Bot第一版-成果簡報.pdf     # 第一版成果簡報 PDF
│   ├── 專題計畫書_AI智慧助理Bot第一版.pdf          # 完整專題企劃規格書 PDF
│   └── 02-課後作業-LINEBot開發與成果展示.docx      # 原始作業規範說明書
│
├── tests/                       # 自動化測試套件 (pytest + Node VM)
│   ├── __init__.py
│   ├── test_gas_syntax.py       # 自動檢驗 7 個 .gs 檔案之 JavaScript 語法
│   ├── test_docs_integrity.py   # 自動檢測所有 Markdown 檔案與實測截圖完整性
│   └── test_payload_mocks.py    # 模擬測試 Telegram Webhook 與 Gemini API Payload
│
├── evals/                       # LLM / Agent 提示詞評估集與 Benchmark
│   ├── eval_coreference.json    # 多輪代名詞指代消歧義評估集
│   ├── eval_search_relevance.json # 2-gram 複合詞新聞檢索召回評估集
│   └── eval_edge_cases.json     # 邊界容錯與自動備援評估集
│
└── conversations/               # 專案對話溯源儲存庫
    ├── README.md                # 對話紀錄索引與查閱說明
    ├── raw/                     # 歷次開發對話完整原始 Markdown 記錄
    │   └── 001_development_and_debugging.md # 全流程開發與除錯原始會話
    └── summaries/               # 每段對話對應的獨立摘要報告
        └── 001_development_and_debugging_summary.md # 結構化關鍵決策與 Bug 修復摘要
```

---

## 🧪 核心情境親自實測紀錄 (嚴格符合作業規範)

依據作業要求，我們在真實 Telegram 上線環境中親自測試了下列三種必備情境，完整記錄「輸入內容、預期結果、實際結果」，未將 AI 的「完成了」作為測試證明：

| 測試類型 | 實際輸入內容 | 預期結果 | 實際測試結果 (含佐證) | 判定 |
| :--- | :--- | :--- | :--- | :---: |
| **情境一：正常使用**<br>(核心功能與即時時事) | `台灣在杭州亞運獲得多少面金牌？` | Bot 於 0.5 秒內顯示檢索狀態，成功抓取最新新聞並回答正確獎牌數與項目，文末附上新聞來源。 | **完美通過**：動態顯示 `🔍 正在檢索...` ➔ 回覆「19面金牌、20面銀牌、28面銅牌，總計67面獎牌，追平隊史最佳紀錄」，並列出滑輪溜冰、圍棋等項目與即時來源。<br>*(佐證：開發紀錄網頁 proof_10)* | ✅ 成功 |
| **情境一：正常使用**<br>(多輪上下文延續) | 輪次 1：`東華大學陳文盛老師` <br>輪次 2：`通識教育中心的陳文盛老師。也是資工系的老師。` <br>輪次 3：`他的開課計劃是什麼？` | 第一輪可能受生科教授同名影響；第二輪補充資訊後，第三輪需精確識別授課 Python 的花中兼任講師並整理課綱。 | **完美通過**：第三輪精準定位「通識教育中心兼任講師、花蓮高中資訊教師」，詳細列出 115-1 預計開設之「Python程式設計入門」、「運算思維」與課程進度規劃。<br>*(佐證：開發紀錄網頁 proof_12, proof_13)* | ✅ 成功 |
| **情境二：輸入不完整**<br>(指代代名詞追問) | `這位老師的課在 Dcard 的評價是什麼？`<br>*(接續在陳老師對話之後，缺少主詞「東華大學 陳文盛」)* | Bot 應能回溯對話記憶補足實體主詞，若外部新聞無相關評價，則誠實回答並過濾無關新聞連結。 | **完美通過**：`expandQueryWithContext` 自動將搜尋詞重構為「東華大學 陳文盛 Dcard 評價」；`filterRelevantArticles` 成功過濾不相干之兒童英文新聞，答案精準說明課程評價重點且**未貼錯誤來源**。<br>*(佐證：開發紀錄網頁 proof_14, proof_15)* | ✅ 成功 |
| **情境三：不支援的輸入**<br>(未授權身分攔截) | 使用未加入 `ALLOWED_USER_IDS` 的帳號傳送任何訊息 | 系統立刻識別為非白名單用戶，阻絕呼叫 Gemini API 消耗額度，並回覆友善的授權提示與 User ID。 | **完美通過**：立即阻擋並回覆：「⛔ 抱歉，您尚未獲得授權使用此機器人。您的 Telegram User ID 為：xxxxxx，請聯繫管理者將您的 ID 加入白名單。」<br>*(佐證：開發紀錄網頁 proof_01)* | ✅ 成功 |
| **情境三：不支援的輸入**<br>(無效或錯誤指令) | `/unknown_command` | 系統應能辨識未定義之指令，不造成腳本崩潰，主動提供支援的指令清單提示。 | **完美通過**：系統平穩回傳 `/help` 指令選單，清楚指引可用指令（`/start`, `/search`, `/news`, `/status`, `/reset`）。 | ✅ 成功 |

---

## 🤖 AI 協作開發紀錄與經驗分享

### 1. 使用之 AI 工具矩陣
- **開發環境與 Agent**：Google Antigravity Agentic IDE
- **核心推論大語言模型**：Gemini 2.5 Flash (`gemini-2.5-flash`)
- **輔助代碼生成與重構**：Claude 3.7 Sonnet

### 2. 代表性 Prompt 指令
```text
「要解決免費版 Gemini API 無法直接使用內建 Google Search Grounding 的 429 限制，
在維持 100% 免費架構下，請幫我使用 Google Apps Script (GAS) 的 UrlFetchApp
抓取 Google News RSS 即時新聞，過濾雜訊後注入到 Prompt 作為背景 Context。
同時為 Telegram Bot 加入 editMessageText 漸進式狀態通知（收到、檢索中、思考中），
並在發生未預期錯誤時以透明方式向用戶報警。」
```

### 3. 一次檢查並修正 AI 產出的真實深刻經驗
* **問題發現 (AI 的邏輯漏洞)**：
  在第四輪測試「這位老師的課在 Dcard 的評價是什麼？」時，AI 初版代碼僅單純抓取搜尋結果，而 Google News RSS 在缺少主詞時傳回了「銘傳大學講座」與「兒童英語營隊」等不相關新聞。AI 沒有對新聞相關性進行審查，直接將這些無關網址附在回答末尾的「參考來源」中，造成嚴重的**「張冠李戴、來源不相干」**問題！
* **人工介入檢查**：
  我們透過 Telegram 實測截圖與 Google Sheets 日誌，發現檢索詞「這位老師」缺乏核心實體，且來源標籤缺乏主體關鍵詞校驗。
* **修正對策**：
  我們要求並重新設計了兩大防禦機制：
  1. **`expandQueryWithContext()`**：自動回溯前一輪對話歷史，提煉出「東華大學 陳文盛」核心實體，將代名詞補全為完整查詢。
  2. **`filterRelevantArticles()`**：逐篇檢查新聞標題與內文摘要是否具備實體關鍵詞，若無相關則全數剔除，絕不把無關連結貼給使用者。
* **重新驗證**：
  修正後重新發送相同提問，無關新聞被 100% 成功攔截，答案精準專注於陳老師課綱，末尾乾淨無贅字，徹底驗證了人類工程師深度審查 AI 產出的必要性！

---

## 🔗 專題交付與成果連結一覽

- 📦 **GitHub 專案倉庫**：[https://github.com/chinkunlim/wk05_bot](https://github.com/chinkunlim/wk05_bot)
- 🌐 **開發紀錄網頁 (GitHub Pages)**：[https://chinkunlim.github.io/wk05_bot/](https://chinkunlim.github.io/wk05_bot/)
- 🔍 **實測證明章節錨點**：[開發紀錄網頁第 5 章 (#proof-of-testing)](https://chinkunlim.github.io/wk05_bot/#proof-of-testing)
- 📄 **專題計畫書 PDF**：[專題計畫書_AI智慧助理Bot第一版.pdf](reports/專題計畫書_AI智慧助理Bot第一版.pdf)
- 📊 **專題成果簡報 PDF**：[TelegramBot-AI智慧助理Bot改善版-成果簡報.pdf](TelegramBot-AI智慧助理Bot改善版-成果簡報.pdf)（課後改善版）/ [LINEBot-AI智慧助理Bot第一版-成果簡報.pdf](reports/LINEBot-AI智慧助理Bot第一版-成果簡報.pdf)（第一版）

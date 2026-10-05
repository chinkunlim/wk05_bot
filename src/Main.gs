/**
 * Main.gs
 * Webhook 進入點 (doPost, doGet) 與 Telegram 指令路由器
 */

/**
 * 處理來自 Telegram 的 Webhook POST 請求
 */
function doPost(e) {
  let chatId = null;
  let messageId = null;
  let statusMsgId = null;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return HtmlService.createHtmlOutput('No content');
    }

    const update = JSON.parse(e.postData.contents);

    // 0. 重複訊息過濾 (Deduplication / 冪等性防護)
    // 防止 Telegram 在網路稍有延遲時觸發重試機制 (Retry Policy)，造成機器人反覆發送相同回覆
    if (update.update_id) {
      const cache = CacheService.getScriptCache();
      const updateKey = `UPDATE_ID_${update.update_id}`;
      if (cache.get(updateKey)) {
        // 此 update_id 已經處理過，立即回傳 OK，阻止重複處理
        return HtmlService.createHtmlOutput('OK');
      }
      // 將此 update_id 記錄於快取 5 分鐘 (300 秒)
      cache.put(updateKey, 'processed', 300);
    }

    // 僅處理文字訊息 (忽略 channel post、edited message 等無 text 的更新)
    if (!update.message || !update.message.text) {
      return HtmlService.createHtmlOutput('Ignored non-text message');
    }

    const msg = update.message;
    chatId = msg.chat.id;
    messageId = msg.message_id;
    const userId = msg.from.id;
    const userName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || msg.from.username || '匿名';
    const text = msg.text.trim();
    const env = getEnv();

    // 1. 白名單安全驗證
    if (!isUserAuthorized(userId)) {
      const rejectMsg = `⛔ <b>存取受限</b>\n\n抱歉，您尚未加入授權白名單。\n您的 Telegram User ID 是：<code>${userId}</code>\n\n若您是管理員，請將上述 ID 加入 Google Apps Script 的 <code>ALLOWED_USER_IDS</code> 屬性中。`;
      sendTelegramMessage(chatId, rejectMsg, messageId);
      return HtmlService.createHtmlOutput('Unauthorized');
    }

    // 2. 系統指令路由
    if (text.startsWith('/')) {
      const command = text.split(' ')[0].toLowerCase().split('@')[0]; // 支援 @botname 指令後綴
      
      switch (command) {
        case '/start':
          const startMsg = `👋 <b>歡迎使用 Gemini AI 助理！</b>\n\n我是由 Google Gemini 驅動的 Telegram 機器人，支援短期對話記憶、即時新聞檢索與日常問答。\n\n📌 <b>常用指令：</b>\n/search &lt;關鍵字&gt; - 即時檢索最新新聞並總結\n/news - 查看今日最新新聞頭條\n/status - 查詢今日剩餘提問額度\n/reset - 清除上下文對話記憶\n/help - 顯示指令說明\n\n請隨時直接傳送文字訊息向我提問！`;
          sendTelegramMessage(chatId, startMsg, messageId);
          return HtmlService.createHtmlOutput('OK');

        case '/help':
          const helpMsg = `📖 <b>Gemini Bot 使用說明</b>\n\n` +
            `• <b>一般提問</b>：直接輸入任何問題，機器人會自動帶入前幾次對話脈絡進行回答。\n` +
            `• <b>即時資訊檢索</b>：詢問包含「今天、最新、新聞、賽事」等關鍵詞時，系統會自動透過雲端檢索最新資訊！\n` +
            `• <b>/search &lt;關鍵字&gt;</b>：主動搜尋特定主題之最新新聞。\n` +
            `• <b>/news</b>：檢索台灣最新即時新聞頭條。\n` +
            `• <b>/status</b>：查看今日已提問次數與剩餘配額（每日自動重置）。\n` +
            `• <b>/reset</b>：若想開啟全新的主題，輸入此指令即可忘記前幾則對話。\n` +
            `• <b>/help</b>：查看本說明清單。`;
          sendTelegramMessage(chatId, helpMsg, messageId);
          return HtmlService.createHtmlOutput('OK');

        case '/status':
          const status = getQuotaStatus(userId);
          const statusMsg = `📊 <b>今日使用額度狀態</b>\n\n` +
            `📅 日期：${status.date}\n` +
            `📈 已使用次數：<b>${status.currentCount}</b> 次\n` +
            `🎯 剩餘可用次數：<b>${status.remaining}</b> 次\n` +
            `🔒 每日上限：${status.maxRequests} 次\n\n` +
            `<i>額度於每日午夜 00:00 自動歸零重置。</i>`;
          sendTelegramMessage(chatId, statusMsg, messageId);
          return HtmlService.createHtmlOutput('OK');

        case '/reset':
          clearConversationHistory(userId);
          const resetMsg = `🧹 <b>對話記憶已清空！</b>\n\n先前的對話脈絡已被重置，接下來的提問將以全新視角為您解答。`;
          sendTelegramMessage(chatId, resetMsg, messageId);
          return HtmlService.createHtmlOutput('OK');

        case '/search':
        case '/news':
          // 搜尋指令直接進入下方配額檢查與檢索生成流程
          break;

        default:
          // 未知指令，忽略或提示
          break;
      }
    }

    // 3. 一般文字問題：檢查每日呼叫額度
    const quota = checkAndConsumeDailyQuota(userId);
    if (!quota.allowed) {
      sendTelegramMessage(chatId, quota.message, messageId);
      return HtmlService.createHtmlOutput('Quota exceeded');
    }

    // 4. 即時狀態回饋：傳送首條狀態訊息，讓使用者在 0.5 秒內掌握系統狀態
    const isSearchIntent = env.enableCustomGrounding && shouldTriggerSearch(text);
    const initialStatusText = isSearchIntent
      ? '🔍 收到提問，正在為您檢索即時資料中...'
      : '⏳ 收到提問，AI 思考生成中...';

    statusMsgId = sendTelegramMessage(chatId, initialStatusText, messageId);
    sendChatAction(chatId, 'typing');

    // 5. 檢索增強 (類 Grounding)：若為時效意圖或搜尋指令，透過 GAS 抓取最新資訊 (支援代詞上下文補全)
    let customGrounding = null;
    if (isSearchIntent) {
      try {
        Logger.log(`🌐 偵測到時效意圖，透過 GAS 發動即時檢索...`);
        const history = getConversationHistory(userId);
        customGrounding = fetchLatestWebInfo(text, CONFIG.SEARCH_MAX_RESULTS || 4, history);
        if (customGrounding && statusMsgId) {
          // 檢索成功且通過相關性校驗，更新狀態訊息
          editTelegramMessage(chatId, statusMsgId, `🧠 即時資料檢索完成，正在分析彙整回答...`);
          sendChatAction(chatId, 'typing');
        }
      } catch (searchErr) {
        Logger.log(`⚠️ 外部即時檢索失敗，平滑降級為標準生成: ${searchErr.message}`);
      }
    }

    // 6. 呼叫 Gemini API 取得回覆
    const geminiResult = callGemini(userId, text, customGrounding);

    if (geminiResult.success) {
      // 7. 寫入問答日誌至 Google Sheets
      logInteraction({
        userId: userId,
        userName: userName,
        prompt: text,
        response: geminiResult.text,
        tokens: geminiResult.tokens,
        dailyCount: quota.currentCount
      });

      // 8. 回覆 Telegram：將 Gemini 的 Markdown 轉換為美觀 HTML，並附加來源與本日額度
      const formattedText = markdownToTelegramHtml(geminiResult.text || '');
      const sources = geminiResult.sourcesHtml || '';
      const footer = `\n\n<i>(本日已提問: ${quota.currentCount}/${quota.maxRequests})</i>`;

      // 雙重安全防禦：若內容本體為空，不發送純頁尾幽靈訊息
      let replyContent;
      if (!formattedText.trim() && !sources.trim()) {
        replyContent = `⚠️ <b>AI 生成內容為空</b>\n\n未能取得有效回答，可能受到安全防護過濾。建議換個角度或調整提問用詞。\n${footer}`;
      } else {
        replyContent = formattedText + sources + footer;
      }

      // 原地編輯替換狀態訊息（極致流暢，不洗版）
      let edited = false;
      if (statusMsgId) {
        edited = editTelegramMessage(chatId, statusMsgId, replyContent);
      }
      // 若原地編輯失敗（如訊息超長），則作為新訊息送出
      if (!edited) {
        sendTelegramMessage(chatId, replyContent, messageId);
      }

    } else {
      // 呼叫失敗處理：明確回報錯誤，終結無聲無息
      const errorMsg = `❌ <b>回覆失敗</b>\n\n${geminiResult.text || '伺服器未回傳有效內容'}\n\n<i>請稍後再試或輸入 /help 查詢指令。</i>`;
      if (statusMsgId) {
        editTelegramMessage(chatId, statusMsgId, errorMsg);
      } else {
        sendTelegramMessage(chatId, errorMsg, messageId);
      }
    }

    return HtmlService.createHtmlOutput('OK');

  } catch (err) {
    Logger.log(`❌ doPost 處理異常: ${err.message}`);
    // 若捕獲全域異常，主動向 Telegram 回報具體原因
    try {
      const alertMsg = `❌ <b>系統處理異常</b>\n\n原因：<code>${err.message}</code>\n\n<i>請檢查網路或稍候重新嘗試。</i>`;
      if (typeof chatId !== 'undefined' && chatId) {
        if (typeof statusMsgId !== 'undefined' && statusMsgId) {
          editTelegramMessage(chatId, statusMsgId, alertMsg);
        } else {
          sendTelegramMessage(chatId, alertMsg);
        }
      }
    } catch (e) {
      Logger.log(`❌ 發送錯誤通知失敗: ${e.message}`);
    }
    return HtmlService.createHtmlOutput('Internal Error');
  }
}

/**
 * 網頁健康檢查 (瀏覽器直接開啟 Web App 網址時顯示)
 */
function doGet(e) {
  const html = `
    <html>
      <head>
        <title>Telegram Gemini Bot Status</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8f9fa; }
          .card { background: white; padding: 30px 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; }
          h2 { color: #1a73e8; margin-bottom: 10px; }
          p { color: #5f6368; line-height: 1.6; }
          .badge { display: inline-block; background-color: #e6f4ea; color: #137333; padding: 4px 12px; border-radius: 16px; font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>🤖 Telegram Gemini Bot</h2>
          <div class="badge">● 24/7 正常運行中</div>
          <p>Google Apps Script Webhook 服務運作正常。<br>此網址用於 Telegram Webhook 回調。</p>
        </div>
      </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html).setTitle('Telegram Gemini Bot');
}

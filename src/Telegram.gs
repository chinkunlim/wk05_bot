/**
 * Telegram.gs
 * 封裝 Telegram Bot API 通訊方法，包含訊息發送、狀態指示、長文切割以及一鍵 Webhook 註冊與佇列清空
 */

/**
 * 發送訊息給 Telegram 使用者 (自動支援超過 4096 字元的長訊息分段發送)
 * @param {string|number} chatId 聊天室 ID
 * @param {string} text 訊息內文
 * @param {number} [replyToMessageId] 可選的引述訊息 ID
 */
function sendTelegramMessage(chatId, text, replyToMessageId) {
  const env = getEnv();
  if (!env.telegramToken) {
    Logger.log('❌ 錯誤：未設定 TELEGRAM_BOT_TOKEN');
    return;
  }

  const MAX_CHUNK_LENGTH = 4000; // Telegram 單則訊息上限為 4096，保留緩衝設 4000
  const url = `${CONFIG.TELEGRAM_API_BASE_URL}${env.telegramToken}/sendMessage`;

  // 若文字長度小於等於 4000 字元，直接發送
  if (text.length <= MAX_CHUNK_LENGTH) {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      allow_sending_without_reply: true
    };
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }
    _sendTelegramRequest(url, payload, text, chatId);
    return;
  }

  // 若文字超過 4000 字元，依段落或長度切片循序發送
  let remainingText = text;
  let isFirstChunk = true;

  while (remainingText.length > 0) {
    let chunkSize = Math.min(MAX_CHUNK_LENGTH, remainingText.length);
    // 盡量在換行符號處切分，維持語意通順
    if (chunkSize === MAX_CHUNK_LENGTH) {
      const lastNewline = remainingText.lastIndexOf('\n', MAX_CHUNK_LENGTH);
      if (lastNewline > 2000) {
        chunkSize = lastNewline + 1;
      }
    }

    const chunk = remainingText.substring(0, chunkSize);
    remainingText = remainingText.substring(chunkSize);

    const payload = {
      chat_id: chatId,
      text: chunk,
      parse_mode: 'HTML',
      allow_sending_without_reply: true
    };
    if (isFirstChunk && replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    _sendTelegramRequest(url, payload, chunk, chatId);
    isFirstChunk = false;
    Utilities.sleep(200); // 避免頻繁送出觸發 Telegram 限速
  }
}

/**
 * 內部通用發送請求 (若 HTML 解析失敗自動退回純文字發送)
 */
function _sendTelegramRequest(url, payload, originalText, chatId) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    if (!result.ok) {
      Logger.log(`⚠️ Telegram 發送警告: ${result.description}，嘗試降級為純文字重試...`);
      // 降級退回純文字
      const fallbackOptions = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: chatId,
          text: originalText
        }),
        muteHttpExceptions: true
      };
      UrlFetchApp.fetch(url, fallbackOptions);
    }
  } catch (err) {
    Logger.log(`❌ Telegram 發送失敗: ${err.message}`);
  }
}

/**
 * 發送「正在輸入 (typing)」動作，提升使用者體驗
 * @param {string|number} chatId 聊天室 ID
 */
function sendChatAction(chatId, action = 'typing') {
  const env = getEnv();
  if (!env.telegramToken) return;

  const url = `${CONFIG.TELEGRAM_API_BASE_URL}${env.telegramToken}/sendChatAction`;
  const payload = {
    chat_id: chatId,
    action: action
  };

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log(`⚠️ sendChatAction 呼叫失敗 (非關鍵): ${err.message}`);
  }
}

/**
 * 【一鍵設定 Webhook】在 GAS 編輯器直接執行此函式即可完成 Webhook 註冊，預設自動清除累積的卡死舊請求
 */
function setupTelegramWebhook(dropPending = true) {
  const env = getEnv();
  if (!env.telegramToken) {
    Logger.log('❌ 請先在 Script Properties 設定 TELEGRAM_BOT_TOKEN');
    return;
  }
  if (!env.webhookUrl) {
    Logger.log('❌ 請先在 Script Properties 設定 WEBHOOK_URL (部署為網頁應用程式後的網址)');
    return;
  }

  const dropParam = dropPending ? '&drop_pending_updates=true' : '';
  const url = `${CONFIG.TELEGRAM_API_BASE_URL}${env.telegramToken}/setWebhook?url=${encodeURIComponent(env.webhookUrl)}${dropParam}`;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log('📡 Webhook 設定結果: ' + response.getContentText());
  return response.getContentText();
}

/**
 * 【一鍵清空 Telegram 重複訊息堆積】若遇到機器人不斷重複發送先前的訊息，執行此函式可立即停止！
 */
function clearTelegramPendingUpdates() {
  const env = getEnv();
  if (!env.telegramToken) {
    Logger.log('❌ 請先在 Script Properties 設定 TELEGRAM_BOT_TOKEN');
    return;
  }
  if (!env.webhookUrl) {
    Logger.log('❌ 請先在 Script Properties 設定 WEBHOOK_URL');
    return;
  }

  Logger.log('🧹 正在清除 Telegram 伺服器端積壓的重試佇列 (drop_pending_updates)...');
  const url = `${CONFIG.TELEGRAM_API_BASE_URL}${env.telegramToken}/setWebhook?url=${encodeURIComponent(env.webhookUrl)}&drop_pending_updates=true`;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log('✅ 清理完成！Telegram 回應: ' + response.getContentText());
  return response.getContentText();
}

/**
 * 【查詢 Webhook 狀態與診斷】在 GAS 編輯器執行此函式，檢查目前 Webhook 連線健康狀態與積壓量
 */
function getTelegramWebhookInfo() {
  const env = getEnv();
  if (!env.telegramToken) {
    Logger.log('❌ 請先在 Script Properties 設定 TELEGRAM_BOT_TOKEN');
    return;
  }

  const url = `${CONFIG.TELEGRAM_API_BASE_URL}${env.telegramToken}/getWebhookInfo`;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const rawText = response.getContentText();
  
  try {
    const data = JSON.parse(rawText);
    const res = data.result || {};
    Logger.log('====================================================');
    Logger.log('📋 Telegram Webhook 診斷資訊：');
    Logger.log('====================================================');
    Logger.log('🔗 註冊網址 (URL): ' + (res.url || '未註冊任何網址'));
    Logger.log('⏳ 積壓未送達訊息數 (pending_update_count): ' + (res.pending_update_count ?? '無'));
    if (res.last_error_message) {
      Logger.log('⚠️ 最近錯誤訊息 (last_error_message): ' + res.last_error_message);
      if (res.last_error_date) {
        const errorDate = new Date(res.last_error_date * 1000).toLocaleString();
        Logger.log('⚠️ 錯誤發生時間: ' + errorDate);
      }
    } else {
      Logger.log('✅ 最近無任何錯誤記錄');
    }
    Logger.log('====================================================');
  } catch (e) {
    Logger.log('📋 原始回傳: ' + rawText);
  }
  
  return rawText;
}

/**
 * 【移除 Webhook】若需要取消 Webhook 連線時執行
 */
function deleteTelegramWebhook() {
  const env = getEnv();
  if (!env.telegramToken) {
    Logger.log('❌ 請先在 Script Properties 設定 TELEGRAM_BOT_TOKEN');
    return;
  }

  const url = `${CONFIG.TELEGRAM_API_BASE_URL}${env.telegramToken}/deleteWebhook`;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log('🗑️ Webhook 移除結果: ' + response.getContentText());
  return response.getContentText();
}

/**
 * 將 Gemini 產生的標準 Markdown 轉換為 Telegram 支援的美觀 HTML 標籤
 * @param {string} markdown 原始 Markdown 字串
 * @returns {string} 轉換後的 Telegram HTML 字串
 */
function markdownToTelegramHtml(markdown) {
  if (!markdown) return '';
  let text = markdown;

  // 1. 暫存多行程式碼區塊
  const codeBlocks = [];
  text = text.replace(/```([\s\S]*?)```/g, function(match, code) {
    const placeholder = 'TAGCODEBLOCK' + codeBlocks.length + 'END';
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    codeBlocks.push('<pre><code>' + escaped.trim() + '</code></pre>');
    return placeholder;
  });

  // 2. 暫存單行行內程式碼
  const inlineCodes = [];
  text = text.replace(/`([^`\n]+)`/g, function(match, code) {
    const placeholder = 'TAGINLINECODE' + inlineCodes.length + 'END';
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    inlineCodes.push('<code>' + escaped + '</code>');
    return placeholder;
  });

  // 3. 跳脫一般文本中的 HTML 特殊字元避免破壞 Telegram 解析
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 4. 超連結 [文字](url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2">$1</a>');

  // 5. 標題語法 (#, ##, ### 等) 轉為粗體
  text = text.replace(/^#{1,6}\s*(.+)$/gm, '<b>$1</b>');

  // 6. 粗體 **文字** (若中途截斷有未閉合的 ** 則自動補齊閉合)
  const boldCount = (text.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) {
    text += '**';
  }
  text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  // 7. 斜體 *文字* 或 _文字_
  text = text.replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, '$1<i>$2</i>$3');
  text = text.replace(/(^|[^_])_([^_ \n]+)_([^_]|$)/g, '$1<i>$2</i>$3');

  // 8. 項目符號清單 (* 或 - 開頭)
  text = text.replace(/^[\*\-]\s+(.+)$/gm, '• $1');

  // 9. 分割線 ---
  text = text.replace(/^---+$/gm, '──────────────');

  // 10. 還原程式碼區塊
  inlineCodes.forEach((codeHtml, idx) => {
    text = text.replace('TAGINLINECODE' + idx + 'END', codeHtml);
  });
  codeBlocks.forEach((blockHtml, idx) => {
    text = text.replace('TAGCODEBLOCK' + idx + 'END', blockHtml);
  });

  return text;
}


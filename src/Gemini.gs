/**
 * Gemini.gs
 * 封裝 Google Gemini REST API 呼叫，處理上下文歷史格式化、Token 統計、模型清單查詢與例外捕捉
 */

/**
 * 呼叫 Gemini API 產生回覆，並維護短期對話記憶
 * @param {string|number} userId Telegram 使用者 ID
 * @param {string} userPrompt 使用者當前提問
 * @param {Object|null} customGrounding 自建類 Grounding 檢索資料 { contextText, sources }
 * @returns {Object} 包含 success, text, tokens, error
 */
function callGemini(userId, userPrompt, customGrounding = null) {
  const env = getEnv();
  if (!env.geminiApiKey) {
    return {
      success: false,
      text: '❌ 系統尚未設定 GEMINI_API_KEY，請聯絡管理員。',
      error: 'Missing GEMINI_API_KEY'
    };
  }

  // 1. 取得使用者的短期對話歷史
  const history = getConversationHistory(userId);

  // 2. 組裝 contents 陣列
  // 格式: [{ role: 'user', parts: [{ text: '...' }] }, { role: 'model', parts: [{ text: '...' }] }]
  const contents = [];
  history.forEach(turn => {
    if (turn && turn.user && turn.model && turn.model.trim()) {
      contents.push({
        role: 'user',
        parts: [{ text: turn.user }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: turn.model.trim() }]
      });
    }
  });

  // 檢查是否為「繼續」意圖 (例如：繼續、請繼續、continue、接著說 等)
  const isContinuation = /^(繼續|请继续|請繼續|continue|接著說|接著寫|接續|往下說)$/i.test(userPrompt.trim());
  let actualPrompt = userPrompt;

  if (isContinuation) {
    actualPrompt = '請緊接著上一段回覆中斷的地方繼續往下說明，不要重複前面已經說過的內容，直接無縫接續後續重點。';
  } else if (customGrounding && customGrounding.contextText) {
    actualPrompt = `【即時外部檢索資料】\n${customGrounding.contextText}\n\n【使用者問題】\n${userPrompt}\n\n請以繁體中文，綜合參考上述最新檢索到的即時外部資料，為使用者提供詳細、準確且客觀的回答。`;
  }

  // 加入當前使用者的問題
  contents.push({
    role: 'user',
    parts: [{ text: actualPrompt }]
  });

  const modelName = env.geminiModel || CONFIG.DEFAULT_GEMINI_MODEL;
  const url = `${CONFIG.GEMINI_API_BASE_URL}/${modelName}:generateContent?key=${env.geminiApiKey}`;

  const timeZone = Session.getScriptTimeZone() || 'Asia/Taipei';
  const currentDateStr = Utilities.formatDate(new Date(), timeZone, 'yyyy年MM月dd日');
  const currentYearStr = Utilities.formatDate(new Date(), timeZone, 'yyyy');

  const payload = {
    contents: contents,
    systemInstruction: {
      parts: [
        {
          text: `你是專業、友善且樂於助人的智慧助理。請以清晰、有條理且自然的繁體中文回答使用者的問題。

【時間基準與資訊處理原則】
1. 現在真實世界的時間基準為：${currentDateStr}（台灣/台北時區，當前年份為 ${currentYearStr} 年）。回答涉及年份與日期時請以此為準。
2. 若提問附有【即時外部檢索資料】，請優先根據該最新檢索資訊進行綜合分析與客觀回答。
3. 若提問涉及即時動態或觀測數據（如即時氣溫/天氣觀測、即時賽事比分、當日即時股價走勢等），且未檢索到即時數值時：
   - 請勿僅以單薄的「我無法連網」機械式拒絕或回傳空白。
   - 請主動根據你的知識庫，提供該主題之通用背景知識、常態規律、歷史趨勢或實用建議。
   - 並在文末友善提醒使用者可透過權威即時管道（例如氣象署、官方網站、行情看板等）查閱當下最新的精確觀測數據。`
        }
      ]
    },
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_ONLY_HIGH"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_ONLY_HIGH"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_ONLY_HIGH"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH"
      }
    ]
  };

  // 若開啟聯網搜尋 (Google Search Grounding)，掛載 google_search 工具
  if (env.enableGoogleSearch) {
    payload.tools = [
      {
        google_search: {}
      }
    ];
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const maxRetries = 2;
  let isGroundingFallback = false;
  let isModelFallback = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      Logger.log(`⏳ Gemini 遇到暫態錯誤，正在進行第 ${attempt} 次自動重試 (間隔 1.5 秒)...`);
      Utilities.sleep(1500 * attempt);
    }

    try {
      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();
      const data = JSON.parse(responseText);

      if (statusCode === 200) {
        // 擷取生成的文字內容
        const candidate = data.candidates && data.candidates[0];
        if (!candidate) {
          const blockReason = data.promptFeedback && data.promptFeedback.blockReason;
          return {
            success: false,
            text: `⚠️ 提問內容觸發了安全性審查 (${blockReason || 'SAFETY'})，請調整問題用詞後重新嘗試。`,
            error: 'Prompt blocked'
          };
        }

        let replyText = '';
        if (candidate.content && candidate.content.parts) {
          replyText = candidate.content.parts.map(p => p.text || '').join('').trim();
        }
        const finishReason = candidate.finishReason || '';

        // 嚴格非空防禦：若回覆為空字串，嚴禁當作成功！
        if (!replyText) {
          Logger.log(`⚠️ Gemini 回傳內容為空，finishReason: ${finishReason}`);
          let emptyTip = '⚠️ AI 生成回覆為空，請重新提問。';
          if (finishReason === 'SAFETY') {
            emptyTip = '⚠️ 該提問內容涉及特定人物或隱私評價，觸發了 AI 安全隱私防護過濾機制，未能生成回覆。建議調整語句或換個角度提問。';
          } else if (finishReason === 'RECITATION') {
            emptyTip = '⚠️ 該提問可能涉及版權重製限制，觸發了引用防護。';
          }
          return {
            success: false,
            text: emptyTip,
            error: `Empty response with finishReason: ${finishReason}`
          };
        }

        // 檢查是否因達到 Token 上限而被截斷
        if (finishReason === 'MAX_TOKENS') {
          replyText += '\n\n<i>⚠️（因回答內容較長中斷，請直接回覆「繼續」讓我接著回答）</i>';
        }

        // 擷取 Grounding 聯網搜尋之參考來源
        const grounding = candidate.groundingMetadata || {};
        const chunks = grounding.groundingChunks || [];
        const sources = [];
        const seenUris = new Set();

        chunks.forEach(chunk => {
          if (chunk.web && chunk.web.uri) {
            const uri = chunk.web.uri;
            if (!seenUris.has(uri)) {
              seenUris.add(uri);
              const title = chunk.web.title || '參考網頁';
              sources.push(`<a href="${uri}">${title}</a>`);
            }
          }
        });

        let sourcesHtml = '';
        if (sources.length > 0) {
          sourcesHtml = '\n\n🔍 <b>參考來源：</b>\n• ' + sources.slice(0, 4).join('\n• ');
        } else if (customGrounding && customGrounding.sources && customGrounding.sources.length > 0) {
          // 自建類 Grounding 來源
          const customList = customGrounding.sources.slice(0, 4).map(s => `<a href="${s.url}">${s.title}</a>`);
          sourcesHtml = '\n\n🔍 <b>即時檢索來源（GAS 雲端即時資訊）：</b>\n• ' + customList.join('\n• ');
        } else if (isGroundingFallback) {
          // 若是由於官方 Grounding 429 降級且無自建檢索
          sourcesHtml = '\n\n<i>ℹ️（註：Google 免費帳號未開通即時搜尋額度，本回答依據 AI 模型基礎知識庫為您解答）</i>';
        }

        // 若觸發了模型自動備援降級，貼心提示使用者
        if (isModelFallback) {
          sourcesHtml += `\n\n<i>ℹ️（提示：自訂模型「${modelName}」無回應或未上線，系統已自動切換為預設穩定模型「${CONFIG.DEFAULT_GEMINI_MODEL}」解答）</i>`;
        }

        // 擷取 Token 消耗統計
        const usage = data.usageMetadata || {};
        const tokens = {
          promptTokens: usage.promptTokenCount || 0,
          candidatesTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0
        };

        // 3. 更新對話歷史記憶 (嚴格確保不存入空內容)
        if (isContinuation && history.length > 0) {
          // 若為「繼續」操作，將新內容無縫追加到前一次回答末尾，並移除先前的中斷提示
          const lastTurn = history[history.length - 1];
          const cleanedLastModel = lastTurn.model.replace(/\n\n<i>⚠️（因回答內容較長中斷，請直接回覆「繼續」讓我接著回答）<\/i>/g, '');
          lastTurn.model = cleanedLastModel + '\n' + replyText;
        } else if (replyText) {
          history.push({
            user: userPrompt,
            model: replyText
          });
        }

        while (history.length > CONFIG.MAX_HISTORY_TURNS) {
          history.shift();
        }
        saveConversationHistory(userId, history);

        return {
          success: true,
          text: replyText,
          sourcesHtml: sourcesHtml,
          tokens: tokens
        };
      }

      // 若是因 Google Search Grounding 觸發的 429 配額限制或工具不支援錯誤，自動移除 tools 降級重發！
      if (payload.tools && (statusCode === 429 || (statusCode === 400 && responseText.includes('tool')))) {
        Logger.log(`⚠️ 偵測到 Google Search Grounding 額度限制 (HTTP ${statusCode})，自動降級為標準生成模式重試...`);
        delete payload.tools;
        options.payload = JSON.stringify(payload);
        isGroundingFallback = true;
        continue;
      }

      // 若是因自訂模型不存在或端點不可用 (503 或 404)，且自訂模型不等於預設模型，進行自動容錯降級重試！
      if ((statusCode === 503 || statusCode === 404) && modelName !== CONFIG.DEFAULT_GEMINI_MODEL && !isModelFallback) {
        Logger.log(`⚠️ 自訂模型「${modelName}」請求失敗 (HTTP ${statusCode})，自動切換為預設穩定模型「${CONFIG.DEFAULT_GEMINI_MODEL}」重試...`);
        isModelFallback = true;
        url = `${CONFIG.GEMINI_API_BASE_URL}/${CONFIG.DEFAULT_GEMINI_MODEL}:generateContent?key=${env.geminiApiKey}`;
        continue;
      }

      // 若遇到 Google 伺服器過載 (500, 502, 503, 504)，且還有重試次數，進行重試
      if ([500, 502, 503, 504].includes(statusCode) && attempt < maxRetries) {
        Logger.log(`⚠️ Gemini 伺服器繁忙 (HTTP ${statusCode})，準備重試...`);
        continue;
      }

      // 重試耗盡或遇到不可重試之錯誤
      Logger.log(`❌ Gemini API 錯誤 (${statusCode}) [模型: ${modelName}]: ${responseText}`);
      let userFriendlyMsg = `抱歉，Gemini 服務異常 (HTTP ${statusCode})。`;
      if (statusCode === 503 || statusCode === 500) {
        userFriendlyMsg = `⚠️ Google Gemini 伺服器目前繁忙過載 (HTTP ${statusCode})，或模型「${modelName}」端點未開放。\n請稍候 5~10 秒後重試，或至 GAS 執行 listGeminiModels() 檢查可用模型代號。`;
      } else if (statusCode === 429) {
        userFriendlyMsg = '⚠️ Gemini API 免費額度頻率受限 (HTTP 429 Rate Limit)，請稍候 1~2 分鐘後再試。';
      } else if (statusCode === 404) {
        userFriendlyMsg = `❌ 模型「${modelName}」不存在或已停用 (HTTP 404)。\n請在 GAS 執行 listGeminiModels() 檢查可用模型，並至指令碼屬性更新 GEMINI_MODEL。`;
      } else if (statusCode === 400 || statusCode === 403) {
        const errorDetail = data.error ? data.error.message : '';
        userFriendlyMsg = `❌ Gemini API 請求錯誤 (HTTP ${statusCode}): ${errorDetail}`;
      }

      return {
        success: false,
        text: userFriendlyMsg,
        error: `HTTP ${statusCode}: ${responseText}`
      };

    } catch (err) {
      if (attempt < maxRetries) {
        Logger.log(`⚠️ 網路連線例外，準備重試: ${err.message}`);
        continue;
      }
      Logger.log(`❌ 呼叫 Gemini 最終例外: ${err.message}`);
      return {
        success: false,
        text: `系統連線發生例外 (${err.message})，請稍候再試。`,
        error: err.message
      };
    }
  }
}

/**
 * 【一鍵查詢可用模型清單】在 GAS 編輯器中執行此函式，會以您的 API Key 列出目前所有支援 generateContent 的模型
 */
function listGeminiModels() {
  const env = getEnv();
  if (!env.geminiApiKey) {
    Logger.log('❌ 尚未設定 GEMINI_API_KEY，請先至「專案設定 ➔ 指令碼屬性」填入您的 API Key。');
    return;
  }

  Logger.log('🔍 正在向 Google API 查詢您金鑰支援的最新模型清單...');
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${env.geminiApiKey}`;
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const statusCode = response.getResponseCode();
    const result = JSON.parse(response.getContentText());

    if (statusCode !== 200) {
      Logger.log(`❌ 查詢失敗 (${statusCode}): ${response.getContentText()}`);
      return;
    }

    const allModels = result.models || [];
    // 過濾出支援 generateContent 的對話生成模型
    const chatModels = allModels.filter(m => 
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
    );

    Logger.log('====================================================');
    Logger.log(`✅ 成功取得模型清單！共發現 ${chatModels.length} 個支援對話生成的模型：`);
    Logger.log('====================================================');
    
    chatModels.forEach((m, idx) => {
      // 去除前面的 "models/" 前綴，只保留可用於 API 的名稱
      const cleanName = m.name.replace('models/', '');
      Logger.log(`[${idx + 1}] 模型代號: ${cleanName}`);
      Logger.log(`    名稱: ${m.displayName || '無'}`);
      Logger.log(`    描述: ${m.description ? m.description.substring(0, 80) + '...' : '無'}`);
      Logger.log('----------------------------------------------------');
    });

    Logger.log('💡 使用指引：');
    Logger.log('1. 請從上方清單中選取一個適合的模型代號（推薦包含 flash 的模型，例如 gemini-2.0-flash 或最新的 flash 版本）。');
    Logger.log('2. 前往左側「專案設定 ➔ 指令碼屬性」，新增或修改 GEMINI_MODEL 為該代號即可生效！');
    Logger.log('====================================================');

  } catch (err) {
    Logger.log(`❌ 查詢模型時發生例外: ${err.message}`);
  }
}

/**
 * 【連線測試函式】在 GAS 編輯器中執行此函式，測試 Gemini API 是否能正常連線
 */
function testGeminiApi() {
  const env = getEnv();
  Logger.log(`🧪 正在測試 Gemini API 連線 [目前設定模型: ${env.geminiModel}]...`);
  const result = callGemini('TEST_USER_999', '請用繁體中文以一句話自我介紹。');
  Logger.log('測試結果: ' + JSON.stringify(result, null, 2));
}

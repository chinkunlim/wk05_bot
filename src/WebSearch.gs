/**
 * WebSearch.gs
 * Google Apps Script 雲端原生「類 Grounding」即時資料檢索系統
 * 透過 UrlFetchApp 抓取最新開放資料與新聞 RSS，過濾雜訊後注入 Gemini Prompt
 */

/**
 * 判斷訊息是否需要觸發外部即時資料檢索
 * @param {string} text 使用者輸入的原始文字
 * @returns {boolean} 是否需要檢索
 */
function shouldTriggerSearch(text) {
  if (!text) return false;
  const trimmed = text.trim();

  // 1. 明確指令觸發
  if (trimmed.startsWith('/search') || trimmed.startsWith('/news')) {
    return true;
  }

  // 2. 時效性與即時事件關鍵詞意圖偵測
  const timeSensitiveKeywords = [
    '今天', '今日', '最新', '新聞', '即時', '現在', '近期', '今年',
    '天氣', '降雨', '氣溫', '颱風', '地震', '開票', '選舉', '賽事',
    '亞運', '奧運', '金牌', '銀牌', '得獎', '比數', '冠軍',
    '股價', '匯率', '台積電', '美股', '發表會', '新產品'
  ];

  return timeSensitiveKeywords.some(kw => trimmed.includes(kw));
}

/**
 * 從使用者提問中提取核心搜尋關鍵字 (智慧清洗標點與提問助詞)
 * @param {string} text 使用者輸入文字
 * @returns {string} 適合傳給搜尋引擎的精簡關鍵字
 */
function extractSearchKeyword(text) {
  if (!text) return '台灣 最新新聞';
  let query = text.trim();

  // 若為指令格式，取指令後的參數
  if (query.startsWith('/search') || query.startsWith('/news')) {
    query = query.replace(/^(\/search|\/news)\s*/i, '').trim();
    if (query.length === 0) return '台灣 最新新聞';
  }

  // 1. 將所有標點符號與換行替換為單一空格
  query = query.replace(/[。，！？!?,\.\n/；;:：]+/g, ' ');

  // 2. 移除常見提問贅詞、助詞與問句語尾
  const stopPhrases = [
    '請問', '請告訴我', '我想知道', '你知道', '有沒有', '可以跟我說',
    '幫我查', '幫我搜尋', '查詢', '一下', '什麼是', '是誰',
    '有教哪些課', '開什麼課', '在哪些系', '評價是什麼', '評價如何',
    '有哪些課', '推薦嗎', '好不好', '可以選嗎', '的老師', '也是'
  ];

  stopPhrases.forEach(phrase => {
    query = query.replace(new RegExp(phrase, 'gi'), ' ');
  });

  // 3. 整理詞彙與空白
  const words = query.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '最新新聞';

  // 若切分後詞彙過多（超過 5 個），只取前 4 個核心詞以提升搜尋引擎命中率
  return words.slice(0, 4).join(' ');
}

/**
 * 透過 Google News RSS 抓取繁體中文即時新聞資料 (支援階梯式搜尋降級)
 * @param {string} query 搜尋關鍵字或問題
 * @param {number} maxResults 最多抓取篇數 (預設 4)
 * @returns {Object|null} 包含 contextText 與 sources 的資料物件，若失敗則回傳 null
 */
function fetchLatestWebInfo(query, maxResults = 4) {
  const keyword = extractSearchKeyword(query);
  Logger.log(`🔍 [WebSearch] 準備為關鍵字進行即時檢索: "${keyword}"`);

  let result = _executeRssSearch(keyword, maxResults);

  // 若初次搜尋未獲取結果，且關鍵字包含多個詞組，嘗試以最具代表性的前兩個核心實體詞進行降級重試
  if (!result) {
    const tokens = keyword.split(' ');
    if (tokens.length >= 3) {
      const simplifiedKeyword = tokens.slice(0, 2).join(' ');
      Logger.log(`🔄 [WebSearch] 初次檢索無結果，自動精簡核心詞進行降級搜尋: "${simplifiedKeyword}"`);
      result = _executeRssSearch(simplifiedKeyword, maxResults);
    }
  }

  return result;
}

/**
 * 執行 Google News RSS 網路請求與解析
 */
function _executeRssSearch(searchQuery, maxResults) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

  try {
    const response = UrlFetchApp.fetch(rssUrl, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GoogleAppsScript-NewsFetcher/1.0)'
      }
    });

    const statusCode = response.getResponseCode();
    if (statusCode !== 200) {
      Logger.log(`⚠️ [WebSearch] RSS 請求失敗，HTTP 代碼: ${statusCode}`);
      return null;
    }

    const xmlText = response.getContentText('UTF-8');
    return parseAndCleanNewsRss(xmlText, maxResults, searchQuery);
  } catch (error) {
    Logger.log(`❌ [WebSearch] 抓取即時資訊發生例外: ${error.message}`);
    return null;
  }
}

/**
 * 解析 Google News RSS XML，清洗雜訊並精簡字數
 * @param {string} xmlText XML 原始文字
 * @param {number} maxResults 最多條數
 * @param {string} keyword 關鍵字
 * @returns {Object} { contextText, sources }
 */
function parseAndCleanNewsRss(xmlText, maxResults, keyword) {
  const sources = [];
  const articleSummaries = [];

  // 使用正則表達式高效提取 <item> 區塊，避免大型 XML 解析開銷
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  let count = 0;

  while ((match = itemRegex.exec(xmlText)) !== null && count < maxResults) {
    const itemContent = match[1];

    // 擷取標題
    const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(itemContent);
    let title = titleMatch ? decodeXmlEntities(titleMatch[1].trim()) : '';

    // 擷取原始連結
    const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemContent);
    let link = linkMatch ? linkMatch[1].trim() : '';

    // 擷取發布時間
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemContent);
    let pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';

    // 擷取摘要描述
    const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(itemContent);
    let description = descMatch ? stripHtmlTags(decodeXmlEntities(descMatch[1])) : '';

    if (title) {
      // 縮減長度保護 Token
      if (description.length > 200) {
        description = description.substring(0, 200) + '...';
      }

      count++;
      articleSummaries.push(
        `【資訊 ${count}】\n標題：${title}\n時間：${pubDate}\n摘要：${description || '無詳細摘要'}`
      );

      sources.push({
        title: title,
        url: link
      });
    }
  }

  if (sources.length === 0) {
    Logger.log(`⚠️ [WebSearch] 未找到關鍵字 "${keyword}" 的相關即時新聞。`);
    return null;
  }

  const contextText = `【檢索關鍵字】${keyword}\n【檢索時間】${Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss')}\n\n` +
    articleSummaries.join('\n\n');

  Logger.log(`✅ [WebSearch] 成功取得 ${sources.length} 則即時新聞資料`);

  return {
    keyword: keyword,
    contextText: contextText,
    sources: sources
  };
}

/**
 * 去除字串中的 HTML 標籤
 * @param {string} html 帶有 HTML 標籤的字串
 * @returns {string} 純文字
 */
function stripHtmlTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * 解碼常見 XML / HTML 實體符號
 * @param {string} str 包含實體的字串
 * @returns {string} 解碼後字串
 */
function decodeXmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * 【開發者單元測試函式】
 * 在 GAS 編輯器中執行此函式，可直接在「執行記錄」中驗證即時檢索與過濾功能
 */
function testCustomGrounding() {
  const testQuery = '今天 台灣 最新新聞';
  Logger.log(`=== 測試類 Grounding 檢索: "${testQuery}" ===`);

  const result = fetchLatestWebInfo(testQuery, 3);
  if (!result) {
    Logger.log('❌ 測試失敗：未取得檢索結果。');
    return;
  }

  Logger.log('--- 拼裝之背景 Context ---');
  Logger.log(result.contextText);

  Logger.log('--- 來源列表 ---');
  result.sources.forEach((s, idx) => {
    Logger.log(`${idx + 1}. ${s.title} -> ${s.url}`);
  });
  Logger.log('=== 測試成功完成 ===');
}

/**
 * WebSearch.gs
 * Google Apps Script 雲端原生「類 Grounding」即時資料檢索系統 (v1.9.2)
 * 支援代名詞上下文補全 (Coreference Resolution)、Google News RSS 抓取與嚴格相關性校驗 (Relevance Filter)
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

  // 2. 時效性與即時事件關鍵詞意圖偵測 (涵蓋時效、天候、賽事與市場動態之通用詞彙)
  const timeSensitiveKeywords = [
    '今天', '今日', '最新', '新聞', '即時', '現在', '近期', '今年', '剛剛',
    '天氣', '氣候', '降雨', '氣溫', '溫度', '颱風', '地震',
    '比賽', '賽事', '開票', '選舉', '得獎', '比數', '冠軍', '名次',
    '股價', '行情', '匯率', '財報', '營收', '台股', '美股', '大盤', '發表會', '發布會', '新產品'
  ];

  return timeSensitiveKeywords.some(kw => trimmed.includes(kw));
}

/**
 * 根據上下文對話歷史，自動消解代名詞並補全搜尋詞
 * 例如「這部電影的評價如何？」+ 前輪「星際效應」➔ 補全為「星際效應 評價」
 * @param {string} text 使用者當前輸入
 * @param {Array} history 對話歷史陣列
 * @returns {string} 補全後的查詢字串
 */
function expandQueryWithContext(text, history) {
  if (!text) return text;
  if (!history || history.length === 0) return text;

  // 檢查是否包含代名詞或指代詞
  const pronounRegex = /(這(位|名|個)?(老師|教授|人|學校|課)?|他|她|它|該(老師|教授|學校|活動|單位)?)/i;
  const hasPronoun = pronounRegex.test(text);

  // 若提問很短（<= 12 字）或帶有代詞，嘗試從前一輪提取核心實體
  if (hasPronoun || text.length <= 12) {
    const lastTurn = history[history.length - 1];
    const lastUserText = lastTurn.user || '';

    // 從前一輪使用者的問題中萃取實體關鍵詞
    const previousKeywords = extractSearchKeyword(lastUserText);
    if (previousKeywords && previousKeywords !== '台灣 最新新聞') {
      let cleanCurrent = text.replace(/^(\/search|\/news)\s*/i, '').trim();
      cleanCurrent = cleanCurrent.replace(pronounRegex, '').trim();

      const expanded = `${previousKeywords} ${cleanCurrent}`.trim();
      Logger.log(`🔗 [WebSearch] 代詞消解補全: "${text}" ➔ "${expanded}"`);
      return expanded;
    }
  }

  return text;
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

  // 1. 將所有標點符號（包含頓號 、 句號 。 逗號 ， 問號 ？）與換行替換為單一空格
  query = query.replace(/[。，！？!?,\.\n/；;:：、～~—_()（）「」『』《》#@+=*&^%$]+/g, ' ');

  // 2. 移除常見通用提問贅詞、助詞、度量問句與語尾（純通用規則，無硬編碼實體）
  const stopPhrases = [
    '請問', '請告訴我', '我想知道', '你知道', '有沒有', '可以跟我說',
    '幫我查', '幫我搜尋', '搜尋', '查詢', '一下', '什麼是', '是誰',
    '是多少', '多少個', '多少面', '數量', '結果', '如何', '怎麼樣',
    '評價是什麼', '評價如何', '推薦嗎', '好不好', '可以選嗎',
    '開什麼課', '有哪些課', '相關的', '有關的', '表現如何',
    '今天的', '今天', '今日', '明天的', '明天', '昨天的', '昨天',
    '今年的', '今年', '最近的', '最近', '最新的', '最新', '目前的', '目前', '現在'
  ];

  stopPhrases.forEach(phrase => {
    query = query.replace(new RegExp(phrase, 'gi'), ' ');
  });

  // 3. 清理結構助詞與連接詞，留下最具資訊量之核心詞組
  const particles = ['的', '了', '和', '與', '在', '之', '個', '嗎', '呢', '啊', '吧', '請'];
  let words = query.split(/\s+/)
    .map(w => w.replace(/^[的了與和在之個]+|[的了與和在之個]+$/g, ''))
    .filter(w => w.length > 0 && !particles.includes(w));
    
  if (words.length === 0) return '最新新聞';

  // 4. 去重並取前 4 個最具代表性的核心搜尋詞
  const uniqueWords = [...new Set(words)];
  return uniqueWords.slice(0, 4).join(' ');
}

/**
 * 透過 Google News RSS 抓取繁體中文即時新聞資料 (支援通用階梯式搜尋降級與相關性校驗)
 * @param {string} query 搜尋關鍵字或問題
 * @param {number} maxResults 最多抓取篇數 (預設 4)
 * @param {Array} [history] 對話歷史 (用於代詞消解)
 * @returns {Object|null} 包含 contextText 與 sources 的資料物件，若無相關結果則回傳 null
 */
function fetchLatestWebInfo(query, maxResults = 4, history = null) {
  // 1. 若有對話歷史，先進行代詞補全
  const contextQuery = history ? expandQueryWithContext(query, history) : query;
  const keyword = extractSearchKeyword(contextQuery);
  Logger.log(`🔍 [WebSearch] 通用檢索關鍵字: "${keyword}"`);

  // 第一階：精確多詞檢索
  let result = _executeRssSearch(keyword, maxResults);

  // 第二階：若初次無結果且包含多個詞組，進行通用降級搜尋 (取前兩大核心詞)
  if (!result) {
    const tokens = keyword.split(' ');
    if (tokens.length >= 2) {
      const broaderKeyword = tokens.slice(0, 2).join(' ');
      Logger.log(`🔄 [WebSearch] 階梯式重試：降級搜尋 "${broaderKeyword}"...`);
      result = _executeRssSearch(broaderKeyword, maxResults);
    }
  }

  // 第三階：若仍無結果，以第一主詞進行最廣泛檢索
  if (!result) {
    const firstToken = keyword.split(' ')[0];
    if (firstToken && firstToken.length >= 2) {
      Logger.log(`🔄 [WebSearch] 階梯式重試：廣度搜尋 "${firstToken}"...`);
      result = _executeRssSearch(firstToken, maxResults);
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
 * 智慧相關性過濾：支援中文子詞素與 2-gram 柔性比對，防範複合名詞（如「台灣亞運會」）過度誤殺，同時杜絕無關雜訊
 * @param {Array} rawArticles 抓取到的原始新聞條目清單 [{ title, description, link, pubDate }]
 * @param {string} searchKeyword 搜尋關鍵字
 * @returns {Array} 通過相關性校驗的新聞清單
 */
function filterRelevantArticles(rawArticles, searchKeyword) {
  if (!rawArticles || rawArticles.length === 0) return [];
  if (!searchKeyword) return rawArticles;

  // 1. 定義通用停用詞
  const stopWords = ['最新', '新聞', '評價', '如何', '什麼', 'dcard', 'ptt', '今天', '今年', '請問', '查詢', '台灣'];
  const rawTokens = searchKeyword.split(/\s+/).map(t => t.trim()).filter(Boolean);
  const subTokens = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const raw = rawTokens[i];
    if (stopWords.includes(raw.toLowerCase())) continue;

    // 若長詞帶有常見地域前綴（如「台灣亞運會」），提煉去前綴核心詞素（「亞運會」）
    if (raw.length > 2) {
      const stripped = raw.replace(/^(台灣|全台|中華)/, '');
      if (stripped.length >= 2 && !stopWords.includes(stripped) && !subTokens.includes(stripped)) {
        subTokens.push(stripped);
      }
    }

    if (raw.length >= 2 && !stopWords.includes(raw) && !subTokens.includes(raw)) {
      subTokens.push(raw);
    }

    // 長度 >= 3 的名詞自動提煉 2-gram 雙字核心詞素（如「亞運」、「營收」、「財報」）
    if (raw.length >= 3) {
      for (let j = 0; j < raw.length - 1; j++) {
        const bi = raw.substring(j, j + 2);
        if (!stopWords.includes(bi) && bi.length === 2 && !subTokens.includes(bi)) {
          subTokens.push(bi);
        }
      }
    }
  }

  // 若無特定實體名詞（例如純搜最新新聞），全部放行
  if (subTokens.length === 0) {
    return rawArticles;
  }

  // 2. 篩選新聞：標題或摘要命中至少一個核心實體詞素
  const relevant = rawArticles.filter(art => {
    const content = (art.title + ' ' + art.description).toLowerCase();
    return subTokens.some(token => content.includes(token.toLowerCase()));
  });

  Logger.log(`🎯 [WebSearch] 相關性校驗: 原始 ${rawArticles.length} 則 ➔ 命中 ${relevant.length} 則 (詞素: ${subTokens.join(', ')})`);
  return relevant;
}

/**
 * 解析 Google News RSS XML，清洗雜訊並進行嚴格相關性過濾
 * @param {string} xmlText XML 原始文字
 * @param {number} maxResults 最多條數
 * @param {string} keyword 關鍵字
 * @returns {Object|null} { contextText, sources }，若無相關新聞則回傳 null
 */
function parseAndCleanNewsRss(xmlText, maxResults, keyword) {
  const rawArticles = [];

  // 使用正則表達式高效提取 <item> 區塊，避免大型 XML 解析開銷
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null && rawArticles.length < 8) {
    const itemContent = match[1];

    const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(itemContent);
    let title = titleMatch ? decodeXmlEntities(titleMatch[1].trim()) : '';

    const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemContent);
    let link = linkMatch ? linkMatch[1].trim() : '';

    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemContent);
    let pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';

    const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(itemContent);
    let description = descMatch ? stripHtmlTags(decodeXmlEntities(descMatch[1])) : '';

    if (title) {
      if (description.length > 200) {
        description = description.substring(0, 200) + '...';
      }
      rawArticles.push({
        title: title,
        url: link,
        pubDate: pubDate,
        description: description
      });
    }
  }

  // 嚴格相關性過濾：若抓到的新聞與主詞無關（例如搜人名卻搜出兒童英語），直接剔除！
  const relevantArticles = filterRelevantArticles(rawArticles, keyword);

  if (relevantArticles.length === 0) {
    Logger.log(`⚠️ [WebSearch] 檢索結果中無任何新聞與主詞 "${keyword}" 真正相關，判定為無效噪音並捨棄。`);
    return null;
  }

  const finalArticles = relevantArticles.slice(0, maxResults);
  const sources = [];
  const articleSummaries = [];

  finalArticles.forEach((art, idx) => {
    articleSummaries.push(
      `【資訊 ${idx + 1}】\n標題：${art.title}\n時間：${art.pubDate}\n摘要：${art.description || '無詳細摘要'}`
    );
    sources.push({
      title: art.title,
      url: art.url
    });
  });

  const contextText = `【檢索關鍵字】${keyword}\n【檢索時間】${Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss')}\n\n` +
    articleSummaries.join('\n\n');

  Logger.log(`✅ [WebSearch] 成功通過相關性校驗，提供 ${sources.length} 則即時相關資料`);

  return {
    keyword: keyword,
    contextText: contextText,
    sources: sources
  };
}

/**
 * 去除字串中的 HTML 標籤
 */
function stripHtmlTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * 解碼常見 XML / HTML 實體符號
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
 */
function testCustomGrounding() {
  const testQuery = '台灣 最新新聞';
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

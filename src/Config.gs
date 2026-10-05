/**
 * Config.gs
 * 管理全域設定、環境變數（Script Properties）與快取預設值
 */

const CONFIG = {
  // 預設 Gemini 模型 (官方永久別名，保證即時可用且免費用量穩定)
  DEFAULT_GEMINI_MODEL: 'gemini-flash-latest',
  
  // Gemini REST API 端點基礎網址
  GEMINI_API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  
  // Telegram Bot API 基礎網址
  TELEGRAM_API_BASE_URL: 'https://api.telegram.org/bot',
  
  // 短期對話記憶保留輪數 (最新 N 輪，包含使用者的問題與機器人的回答)
  MAX_HISTORY_TURNS: 4,
  
  // 對話快取過期時間 (秒) - 20 分鐘
  CACHE_EXPIRATION_SECONDS: 1200,
  
  // 試算表日誌分頁名稱
  SHEET_NAME: '問答日誌',

  // 自建類 Grounding 即時檢索開關 (預設 true)
  ENABLE_CUSTOM_GROUNDING: true,

  // 每次檢索最大新聞篇數
  SEARCH_MAX_RESULTS: 4
};

// 單次請求記憶體快取，避免重複呼叫 PropertiesService 增加延遲
let _cachedEnv = null;

/**
 * 自動標準化使用者輸入之模型名稱，容錯處理空格、大小寫、前綴缺漏與已棄用端點別名
 * 例如："3.8 flash" ➔ "gemini-3.8-flash"
 *       "2.5" / "2.5-flash" ➔ "gemini-flash-latest" (轉移至官方活體別名)
 *       "lite" ➔ "gemini-flash-lite-latest"
 */
function normalizeModelName(raw) {
  if (!raw) return CONFIG.DEFAULT_GEMINI_MODEL;
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/[\s_]+/g, '-');

  // 常見別名轉移至官方推薦之永久穩定別名
  if (['2.5', '2.0', 'gemini-2.5', 'gemini-2.0', 'gemini-2.5-flash', 'gemini-2.0-flash', 'flash-latest', 'latest'].includes(s)) {
    return 'gemini-flash-latest';
  }
  if (['lite', 'flash-lite', 'gemini-flash-lite', 'lite-latest', '2.5-lite'].includes(s)) {
    return 'gemini-flash-lite-latest';
  }

  if (/^[0-9]/.test(s)) {
    s = 'gemini-' + s;
  } else if (!s.startsWith('gemini-') && !s.startsWith('gemma-') && !s.startsWith('lyria-') && !s.startsWith('nano-') && !s.startsWith('antigravity-') && !s.startsWith('deep-research-')) {
    s = 'gemini-' + s;
  }
  return s;
}

/**
 * 取得腳本屬性 (Script Properties) 中的環境變數
 * @returns {Object} 包含 telegramToken, geminiApiKey, geminiModel, allowedUserIds, maxDailyRequests, webhookUrl
 */
function getEnv() {
  if (_cachedEnv) return _cachedEnv;

  const props = PropertiesService.getScriptProperties();
  const rawAllowedUsers = props.getProperty('ALLOWED_USER_IDS') || '';
  const rawModel = props.getProperty('GEMINI_MODEL') || CONFIG.DEFAULT_GEMINI_MODEL;
  
  _cachedEnv = {
    telegramToken: props.getProperty('TELEGRAM_BOT_TOKEN') || '',
    geminiApiKey: props.getProperty('GEMINI_API_KEY') || '',
    geminiModel: normalizeModelName(rawModel),
    allowedUserIds: rawAllowedUsers
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0),
    maxDailyRequests: parseInt(props.getProperty('MAX_DAILY_REQUESTS') || '50', 10),
    webhookUrl: props.getProperty('WEBHOOK_URL') || '',
    enableGoogleSearch: props.getProperty('ENABLE_GOOGLE_SEARCH') !== 'false', // 官方 Grounding
    enableCustomGrounding: props.getProperty('ENABLE_CUSTOM_GROUNDING') !== 'false' // GAS 自建類 Grounding
  };

  return _cachedEnv;
}

/**
 * 【輔助設定函式】在 GAS 編輯器中執行此函式，可一鍵初始化或更新 Script Properties
 * 請依需要修改下方的預留值，然後在上方函式下拉選單選擇 initProperties 並點擊「執行」
 */
function initProperties() {
  const props = PropertiesService.getScriptProperties();
  
  const currentToken = props.getProperty('TELEGRAM_BOT_TOKEN') || '請填入你的_TELEGRAM_BOT_TOKEN';
  const currentGeminiKey = props.getProperty('GEMINI_API_KEY') || '請填入你的_GEMINI_API_KEY';
  const currentModel = props.getProperty('GEMINI_MODEL') || CONFIG.DEFAULT_GEMINI_MODEL;
  const currentUsers = props.getProperty('ALLOWED_USER_IDS') || '你的_TELEGRAM_USER_ID';
  const currentDailyLimit = props.getProperty('MAX_DAILY_REQUESTS') || '50';
  const currentWebhookUrl = props.getProperty('WEBHOOK_URL') || '';
  const currentSearch = props.getProperty('ENABLE_GOOGLE_SEARCH') || 'false';
  const currentCustomGrounding = props.getProperty('ENABLE_CUSTOM_GROUNDING') || 'true';

  props.setProperties({
    'TELEGRAM_BOT_TOKEN': currentToken,
    'GEMINI_API_KEY': currentGeminiKey,
    'GEMINI_MODEL': currentModel,
    'ALLOWED_USER_IDS': currentUsers,
    'MAX_DAILY_REQUESTS': currentDailyLimit,
    'WEBHOOK_URL': currentWebhookUrl,
    'ENABLE_GOOGLE_SEARCH': currentSearch,
    'ENABLE_CUSTOM_GROUNDING': currentCustomGrounding
  });

  _cachedEnv = null; // 清空快取

  Logger.log('✅ 目前指令碼屬性 (Script Properties) 清單：');
  Logger.log('TELEGRAM_BOT_TOKEN: ' + (props.getProperty('TELEGRAM_BOT_TOKEN') ? '已設定 (隱藏)' : '未設定'));
  Logger.log('GEMINI_API_KEY: ' + (props.getProperty('GEMINI_API_KEY') ? '已設定 (隱藏)' : '未設定'));
  Logger.log('GEMINI_MODEL: ' + props.getProperty('GEMINI_MODEL'));
  Logger.log('ENABLE_CUSTOM_GROUNDING: ' + props.getProperty('ENABLE_CUSTOM_GROUNDING'));
  Logger.log('ENABLE_GOOGLE_SEARCH: ' + props.getProperty('ENABLE_GOOGLE_SEARCH'));
  Logger.log('ALLOWED_USER_IDS: ' + props.getProperty('ALLOWED_USER_IDS'));
  Logger.log('MAX_DAILY_REQUESTS: ' + props.getProperty('MAX_DAILY_REQUESTS'));
  Logger.log('WEBHOOK_URL: ' + props.getProperty('WEBHOOK_URL'));
}

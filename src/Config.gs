/**
 * Config.gs
 * 管理全域設定、環境變數（Script Properties）與快取預設值
 */

const CONFIG = {
  // 預設 Gemini 模型 (若指令碼屬性中未設定 GEMINI_MODEL 時的備援預設值)
  DEFAULT_GEMINI_MODEL: 'gemini-2.0-flash',
  
  // Gemini REST API 端點基礎網址
  GEMINI_API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  
  // Telegram Bot API 基礎網址
  TELEGRAM_API_BASE_URL: 'https://api.telegram.org/bot',
  
  // 短期對話記憶保留輪數 (最新 N 輪，包含使用者的問題與機器人的回答)
  MAX_HISTORY_TURNS: 4,
  
  // 對話快取過期時間 (秒) - 20 分鐘
  CACHE_EXPIRATION_SECONDS: 1200,
  
  // 試算表日誌分頁名稱
  SHEET_NAME: '問答日誌'
};

// 單次請求記憶體快取，避免重複呼叫 PropertiesService 增加延遲
let _cachedEnv = null;

/**
 * 取得腳本屬性 (Script Properties) 中的環境變數
 * @returns {Object} 包含 telegramToken, geminiApiKey, geminiModel, allowedUserIds, maxDailyRequests, webhookUrl
 */
function getEnv() {
  if (_cachedEnv) return _cachedEnv;

  const props = PropertiesService.getScriptProperties();
  const rawAllowedUsers = props.getProperty('ALLOWED_USER_IDS') || '';
  
  _cachedEnv = {
    telegramToken: props.getProperty('TELEGRAM_BOT_TOKEN') || '',
    geminiApiKey: props.getProperty('GEMINI_API_KEY') || '',
    geminiModel: props.getProperty('GEMINI_MODEL') || CONFIG.DEFAULT_GEMINI_MODEL,
    allowedUserIds: rawAllowedUsers
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0),
    maxDailyRequests: parseInt(props.getProperty('MAX_DAILY_REQUESTS') || '50', 10),
    webhookUrl: props.getProperty('WEBHOOK_URL') || '',
    enableGoogleSearch: props.getProperty('ENABLE_GOOGLE_SEARCH') !== 'false' // 預設開啟聯網搜尋
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
  const currentSearch = props.getProperty('ENABLE_GOOGLE_SEARCH') || 'true';

  props.setProperties({
    'TELEGRAM_BOT_TOKEN': currentToken,
    'GEMINI_API_KEY': currentGeminiKey,
    'GEMINI_MODEL': currentModel,
    'ALLOWED_USER_IDS': currentUsers,
    'MAX_DAILY_REQUESTS': currentDailyLimit,
    'WEBHOOK_URL': currentWebhookUrl,
    'ENABLE_GOOGLE_SEARCH': currentSearch
  });

  _cachedEnv = null; // 清空快取

  Logger.log('✅ 目前指令碼屬性 (Script Properties) 清單：');
  Logger.log('TELEGRAM_BOT_TOKEN: ' + (props.getProperty('TELEGRAM_BOT_TOKEN') ? '已設定 (隱藏)' : '未設定'));
  Logger.log('GEMINI_API_KEY: ' + (props.getProperty('GEMINI_API_KEY') ? '已設定 (隱藏)' : '未設定'));
  Logger.log('GEMINI_MODEL: ' + props.getProperty('GEMINI_MODEL'));
  Logger.log('ENABLE_GOOGLE_SEARCH: ' + props.getProperty('ENABLE_GOOGLE_SEARCH'));
  Logger.log('ALLOWED_USER_IDS: ' + props.getProperty('ALLOWED_USER_IDS'));
  Logger.log('MAX_DAILY_REQUESTS: ' + props.getProperty('MAX_DAILY_REQUESTS'));
  Logger.log('WEBHOOK_URL: ' + props.getProperty('WEBHOOK_URL'));
}

/**
 * Storage.gs
 * 負責 Google Sheets 問答日誌持久化儲存與 CacheService 短期對話快取管理
 */

/**
 * 取得或建立問答日誌工作表
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getActiveLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    initSheetHeader(sheet);
  }
  return sheet;
}

/**
 * 初始化試算表表頭與美化樣式
 * @param {GoogleAppsScript.Spreadsheet.Sheet} [targetSheet]
 */
function initSheetHeader(targetSheet) {
  const sheet = targetSheet || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME) || getActiveLogSheet();
  
  if (sheet.getLastRow() === 0) {
    const headers = [
      '時間戳記',
      '使用者 ID',
      '使用者名稱',
      '提問內容',
      'Gemini 回答',
      '輸入 Tokens',
      '輸出 Tokens',
      '總計 Tokens',
      '當日累計次數'
    ];
    
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1a73e8'); // Google Blue
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // 設定常用欄位寬度
    sheet.setColumnWidth(1, 160); // 時間戳記
    sheet.setColumnWidth(2, 120); // 使用者 ID
    sheet.setColumnWidth(3, 140); // 使用者名稱
    sheet.setColumnWidth(4, 280); // 提問內容
    sheet.setColumnWidth(5, 400); // Gemini 回答
    sheet.setColumnWidth(6, 100); // 輸入 Tokens
    sheet.setColumnWidth(7, 100); // 輸出 Tokens
    sheet.setColumnWidth(8, 100); // 總計 Tokens
    sheet.setColumnWidth(9, 110); // 當日累計次數

    sheet.setFrozenRows(1); // 凍結第一行表頭
    Logger.log('✅ 已成功建立並格式化試算表表頭');
  }
}

/**
 * 將一筆問答記錄追加到 Google 試算表
 * @param {Object} data 記錄資料
 */
function logInteraction(data) {
  try {
    const sheet = getActiveLogSheet();
    const timeZone = Session.getScriptTimeZone() || 'Asia/Taipei';
    const timestampStr = Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd HH:mm:ss');

    const row = [
      timestampStr,
      String(data.userId || ''),
      data.userName || '',
      data.prompt || '',
      data.response || '',
      data.tokens ? data.tokens.promptTokens : 0,
      data.tokens ? data.tokens.candidatesTokens : 0,
      data.tokens ? data.tokens.totalTokens : 0,
      data.dailyCount || 0
    ];

    sheet.appendRow(row);
  } catch (err) {
    Logger.log(`❌ 寫入 Google Sheets 日誌失敗: ${err.message}`);
  }
}

/**
 * 取得指定使用者的短期對話歷史 (來自 CacheService)
 * @param {string|number} userId Telegram 使用者 ID
 * @returns {Array<{user: string, model: string}>}
 */
function getConversationHistory(userId) {
  try {
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get(`CHAT_HISTORY_${userId}`);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (err) {
    Logger.log(`⚠️ 讀取對話快取失敗: ${err.message}`);
  }
  return [];
}

/**
 * 儲存使用者的短期對話歷史至 CacheService
 * @param {string|number} userId Telegram 使用者 ID
 * @param {Array<{user: string, model: string}>} history
 */
function saveConversationHistory(userId, history) {
  try {
    const cache = CacheService.getScriptCache();
    cache.put(
      `CHAT_HISTORY_${userId}`,
      JSON.stringify(history),
      CONFIG.CACHE_EXPIRATION_SECONDS
    );
  } catch (err) {
    Logger.log(`⚠️ 寫入對話快取失敗: ${err.message}`);
  }
}

/**
 * 清除指定使用者的對話歷史快取
 * @param {string|number} userId Telegram 使用者 ID
 */
function clearConversationHistory(userId) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(`CHAT_HISTORY_${userId}`);
    Logger.log(`🧹 已清空使用者 ${userId} 的對話歷史`);
  } catch (err) {
    Logger.log(`⚠️ 清除對話快取失敗: ${err.message}`);
  }
}

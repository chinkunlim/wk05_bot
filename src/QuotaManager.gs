/**
 * QuotaManager.gs
 * 管理白名單存取控制與每日呼叫額度防護，避免超額產生費用或遭遇速率限制
 */

/**
 * 取得當前日期字串 (格式: YYYY-MM-DD，依試算表時區或台北時間)
 * @returns {string} 例如 "2026-10-05"
 */
function getTodayDateString() {
  const timeZone = Session.getScriptTimeZone() || 'Asia/Taipei';
  return Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd');
}

/**
 * 檢查使用者是否在授權白名單內
 * @param {string|number} userId 使用者 Telegram ID
 * @returns {boolean}
 */
function isUserAuthorized(userId) {
  const env = getEnv();
  // 若白名單未設定任何 ID，為保護安全，預設不允許任何人
  if (!env.allowedUserIds || env.allowedUserIds.length === 0) {
    return false;
  }
  const strId = String(userId).trim();
  return env.allowedUserIds.includes(strId);
}

/**
 * 檢查並消耗使用者的今日呼叫額度
 * @param {string|number} userId 使用者 Telegram ID
 * @returns {Object} 包含 allowed (布林值), currentCount, remaining, maxRequests
 */
function checkAndConsumeDailyQuota(userId) {
  const env = getEnv();
  const dateStr = getTodayDateString();
  const quotaKey = `QUOTA_${dateStr}_${userId}`;
  
  const props = PropertiesService.getScriptProperties();
  const currentCount = parseInt(props.getProperty(quotaKey) || '0', 10);
  const maxLimit = env.maxDailyRequests;

  if (currentCount >= maxLimit) {
    return {
      allowed: false,
      currentCount: currentCount,
      remaining: 0,
      maxRequests: maxLimit,
      message: `⚠️ 今日免費提問次數已達上限 (${maxLimit}/${maxLimit} 次)。額度將於明天自動重置！`
    };
  }

  // 額度未達上限，增加 1 次
  const newCount = currentCount + 1;
  props.setProperty(quotaKey, String(newCount));

  return {
    allowed: true,
    currentCount: newCount,
    remaining: Math.max(0, maxLimit - newCount),
    maxRequests: maxLimit
  };
}

/**
 * 僅查詢使用者當前額度狀態（不消耗額度）
 * @param {string|number} userId 使用者 Telegram ID
 * @returns {Object} 包含 currentCount, remaining, maxRequests
 */
function getQuotaStatus(userId) {
  const env = getEnv();
  const dateStr = getTodayDateString();
  const quotaKey = `QUOTA_${dateStr}_${userId}`;
  
  const props = PropertiesService.getScriptProperties();
  const currentCount = parseInt(props.getProperty(quotaKey) || '0', 10);
  const maxLimit = env.maxDailyRequests;

  return {
    date: dateStr,
    currentCount: currentCount,
    remaining: Math.max(0, maxLimit - currentCount),
    maxRequests: maxLimit
  };
}

/**
 * 【重置特定使用者今日額度】除錯或測試時可手動呼叫
 */
function resetTodayQuota(userId) {
  const dateStr = getTodayDateString();
  const quotaKey = `QUOTA_${dateStr}_${userId}`;
  PropertiesService.getScriptProperties().deleteProperty(quotaKey);
  Logger.log(`🔄 使用者 ${userId} 的今日 (${dateStr}) 額度已重置`);
}

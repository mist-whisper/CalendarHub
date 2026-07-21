/**
 * src/core/time-utils.js
 * 负责时间格式化与时区转换
 */

/**
 * 将 Date 对象或时间字符串转换为 iCalendar 标准 UTC 格式 (YYYYMMDDTHHmmssZ)
 * @param {Date|string|number} dateInput 
 * @returns {string} 格式化后的时间字符串
 */
function formatDateToICal(dateInput) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new Error(`[TimeUtils] 无效的时间输入: ${dateInput}`);
  }
  
  // 转换为 ISO 字符串 (2028-06-09T19:00:00.000Z) 并去掉分隔符与毫秒
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * 根据比赛开始时间计算默认结束时间（体育比赛默认按 120 分钟计算）
 * @param {Date|string} startTime 
 * @param {number} durationMinutes 默认 120 分钟
 * @returns {Date} 结束时间的 Date 对象
 */
function getEndTime(startTime, durationMinutes = 120) {
  const start = new Date(startTime);
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

module.exports = {
  formatDateToICal,
  getEndTime
};
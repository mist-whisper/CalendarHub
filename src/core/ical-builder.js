/**
 * src/core/ical-builder.js
 * 通用的 iCalendar (.ics) 生成引擎
 */

const { formatDateToICal, getEndTime } = require('./time-utils');

/**
 * 对 iCal 中的特殊字符进行标准转义
 */
function escapeICalText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * 构建 .ics 文本内容
 * @param {object} params
 * @param {string} params.calName 日历名称（如：2028 欧洲杯⚽🇪🇺）
 * @param {Array<object>} params.matches 标准化的比赛对象列表
 * @returns {string} 符合 RFC 5545 规范的 .ics 完整字符串
 */
function buildICalendar({ calName, matches = [] }) {
  const nowICal = formatDateToICal(new Date());

  // 日历头部元数据
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CalendarHub//NONSGML Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(calName)}`,
    'X-WR-TIMEZONE:UTC',
    'REFRESH-INTERVAL;VALUE=DURATION:PT30M',
    'X-PUBLISHED-TTL:PT30M'
  ];

  // 遍历并生成每一个 VEVENT 事件块
  for (const match of matches) {
    const startICal = formatDateToICal(match.startTime);
    const endICal = formatDateToICal(match.endTime || getEndTime(match.startTime));

    // 1. 动态生成 Summary（标题）
    // 比分优先显示（支持已结束或进行中的比赛）
    let summary = `${match.homeTeam} vs ${match.awayTeam}`;
    if (match.score && (match.status === 'FINISHED' || match.status === 'IN_PLAY')) {
      summary = `${match.homeTeam} ${match.score.home}:${match.score.away} ${match.awayTeam}`;
    }

    // 2. 动态生成 Description（描述详情）
    const descParts = [];
    if (match.stage) descParts.push(`阶段: ${match.stage}`);
    if (match.status) descParts.push(`状态: ${match.status}`);
    if (match.venue) descParts.push(`球场: ${match.venue}`);
    if (match.note) descParts.push(`备注: ${match.note}`);
    const description = descParts.join('\n');

    // 3. 构建单个 VEVENT
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${match.id || `match-${startICal}`}@calendarhub`);
    lines.push(`DTSTAMP:${nowICal}`);
    lines.push(`DTSTART:${startICal}`);
    lines.push(`DTEND:${endICal}`);
    lines.push(`SUMMARY:${escapeICalText(summary)}`);
    if (description) {
      lines.push(`DESCRIPTION:${escapeICalText(description)}`);
    }
    if (match.venue) {
      lines.push(`LOCATION:${escapeICalText(match.venue)}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // iCalendar 规范要求换行符必须是 CRLF (\r\n)
  return lines.join('\r\n');
}

module.exports = {
  buildICalendar
};
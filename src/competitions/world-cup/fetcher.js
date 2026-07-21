/**
 * src/competitions/world-cup/fetcher.js
 * 世界杯数据抓取与标准清洗模块
 */

const { fetchJsonWithRetry } = require('../../core/http-client');
const { getTranslatedTeamName } = require('./team-mapper');

/**
 * 赛事阶段英文到中文的映射表
 */
const STAGE_MAP = {
  'GROUP_STAGE': '小组赛',
  'LAST_32': '32强赛',
  'LAST_16': '1/8决赛',
  'QUARTER_FINALS': '1/4决赛',
  'SEMI_FINALS': '半决赛',
  'THIRD_PLACE': '三四名决赛',
  'FINAL': '决赛'
};

/**
 * 抓取并清洗世界杯比赛数据
 * @param {object} config 赛事配置对象 (来自 config.json)
 * @returns {Promise<Array<object>>} 标准化的 Match 对象数组
 */
async function fetchMatches(config) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  const competitionCode = config.competitionCode || 'WC';
  const url = `https://api.football-data.org/v4/competitions/${competitionCode}/matches`;

  const headers = {};
  if (apiKey) {
    headers['X-Auth-Token'] = apiKey;
  }

  console.log(`[WorldCupFetcher] 正在向 API 请求 ${competitionCode} 赛程...`);
  const data = await fetchJsonWithRetry(url, { headers });

  if (!data || !data.matches || !Array.isArray(data.matches)) {
    console.warn('[WorldCupFetcher] 未能获取到有效的比赛列表');
    return [];
  }

  return data.matches.map(match => {
    // 1. 球队名称翻译
    const homeTeam = getTranslatedTeamName(match.homeTeam?.name);
    const awayTeam = getTranslatedTeamName(match.awayTeam?.name);

    // 2. 赛事阶段翻译
    const stage = STAGE_MAP[match.stage] || match.stage || '世界杯';

    // 3. 提取比分与点球大战处理
    let score = null;
    let note = '';

    if (match.score && (match.status === 'FINISHED' || match.status === 'IN_PLAY')) {
      const fullTimeHome = match.score.fullTime?.home ?? 0;
      const fullTimeAway = match.score.fullTime?.away ?? 0;

      // 判断是否触发了点球大战
      if (match.score.duration === 'PENALTY_SHOOTOUT' && match.score.penalties) {
        const penHome = match.score.penalties.home ?? 0;
        const penAway = match.score.penalties.away ?? 0;
        const regHome = match.score.regularTime?.home ?? 0;
        const regAway = match.score.regularTime?.away ?? 0;

        // 设置呈现给标题的总比分
        score = {
          home: fullTimeHome,
          away: fullTimeAway
        };

        note = `常规时间 ${regHome}:${regAway}，点球大战 ${penHome}:${penAway}`;
      } else {
        score = {
          home: fullTimeHome,
          away: fullTimeAway
        };
      }
    }

    // 4. 返回 CalendarHub 标准 Match 数据格式
    return {
      id: `wc-${match.id}`,
      startTime: match.utcDate,
      homeTeam,
      awayTeam,
      score,
      status: match.status,
      stage,
      venue: match.venue || '美加墨世界杯球场',
      note
    };
  });
}

module.exports = {
  fetchMatches
};

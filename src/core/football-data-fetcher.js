/**
 * src/core/football-data-fetcher.js
 * 专用于 football-data.org 平台赛事的通用抓取与清洗基类
 */
const { fetchJsonWithRetry } = require('./http-client');

async function fetchFootballDataMatches(config, teamMapperFn, defaultVenue = '球场') {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  const competitionCode = config.competitionCode;
  const url = `https://api.football-data.org/v4/competitions/${competitionCode}/matches`;

  const headers = apiKey ? { 'X-Auth-Token': apiKey } : {};
  const data = await fetchJsonWithRetry(url, { headers });

  if (!data || !data.matches || !Array.isArray(data.matches)) {
    return [];
  }

  return data.matches.map(match => {
    const homeTeam = teamMapperFn(match.homeTeam?.name);
    const awayTeam = teamMapperFn(match.awayTeam?.name);

    let score = null;
    let note = '';

    if (match.score && (match.status === 'FINISHED' || match.status === 'IN_PLAY')) {
      const fullTimeHome = match.score.fullTime?.home ?? 0;
      const fullTimeAway = match.score.fullTime?.away ?? 0;

      if (match.score.duration === 'PENALTY_SHOOTOUT' && match.score.penalties) {
        const penHome = match.score.penalties.home ?? 0;
        const penAway = match.score.penalties.away ?? 0;
        const regHome = match.score.regularTime?.home ?? 0;
        const regAway = match.score.regularTime?.away ?? 0;

        score = { home: fullTimeHome, away: fullTimeAway };
        note = `常规时间 ${regHome}:${regAway}，点球大战 ${penHome}:${penAway}`;
      } else {
        score = { home: fullTimeHome, away: fullTimeAway };
      }
    }

    return {
      id: `${config.id}-${match.id}`,
      startTime: match.utcDate,
      homeTeam,
      awayTeam,
      score,
      status: match.status,
      stage: match.stage,
      venue: match.venue || defaultVenue,
      note
    };
  });
}

module.exports = { fetchFootballDataMatches };

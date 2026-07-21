/**
 * src/competitions/euro/team-mapper.js
 * 欧洲杯球队中文名与国旗 Emoji 映射表
 */

const TEAM_MAP = {
  // 传统豪强与主力劲旅
  'Germany': '🇩🇪 德国',
  'France': '🇫🇷 法国',
  'Spain': '🇪🇸 西班牙',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿 英格兰',
  'Portugal': '🇵🇹 葡萄牙',
  'Netherlands': '🇳🇱 荷兰',
  'Italy': '🇮🇹 意大利',
  'Belgium': '🇧🇪 比利时',
  'Croatia': '🇭🇷 克罗地亚',
  'Denmark': '🇩🇰 丹麦',
  'Switzerland': '🇨🇭 瑞士',
  'Austria': '🇦🇹 奥地利',

  // 英国与爱尔兰各协会 (2028 联合东道主)
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿 苏格兰',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿 威尔士',
  'Northern Ireland': '🇬🇧 北爱尔兰',
  'Republic of Ireland': '🇮🇪 爱尔兰',
  'Ireland': '🇮🇪 爱尔兰',

  // 欧洲其他常用参赛/预选赛队伍
  'Serbia': '🇷🇸 塞尔维亚',
  'Poland': '🇵🇱 波兰',
  'Ukraine': '🇺🇦 乌克兰',
  'Sweden': '🇸🇪 瑞典',
  'Turkey': '🇹🇷 土耳其',
  'Hungary': '🇭🇺 匈牙利',
  'Czech Republic': '🇨🇿 捷克',
  'Slovakia': '🇸🇰 斯洛伐克',
  'Romania': '🇷🇴 罗马尼亚',
  'Slovenia': '🇸🇮 斯洛文尼亚',
  'Albania': '🇦🇱 阿尔巴尼亚',
  'Georgia': '🇬🇪 格鲁吉亚',
  'Norway': '🇳🇴 挪威',
  'Greece': '🇬🇷 希腊',
  'Finland': '🇫🇮 芬兰',
  'Iceland': '🇮🇸 冰岛',
  'Bosnia and Herzegovina': '🇧🇦 波黑',
  'Israel': '🇮🇱 以色列',
  'Montenegro': '🇲🇪 黑山',
  'North Macedonia': '🇲🇰 北马其顿'
};

/**
 * 翻译球队名称
 * @param {string} englishName API 返回的原始球队名称
 * @returns {string} 带有 Emoji 的中文名称
 */
function getTranslatedTeamName(englishName) {
  if (!englishName) return '待定';

  // 1. 字典精准匹配
  if (TEAM_MAP[englishName]) {
    return TEAM_MAP[englishName];
  }

  // 2. 欧洲杯小组赛/淘汰赛占位符解析
  if (englishName.includes('Winner Group')) {
    const group = englishName.replace('Winner Group', '').trim();
    return `⏳ ${group}组第一`;
  }
  if (englishName.includes('Runner-up Group')) {
    const group = englishName.replace('Runner-up Group', '').trim();
    return `⏳ ${group}组第二`;
  }
  if (englishName.includes('3rd Group')) {
    return `⏳ 最佳小组第三`;
  }
  if (englishName.includes('Winner Match') || englishName.includes('Winner M')) {
    return `⏳ 胜者`;
  }

  // 3. 未知球队兜底
  return `🇪🇺 ${englishName}`;
}

module.exports = {
  getTranslatedTeamName
};

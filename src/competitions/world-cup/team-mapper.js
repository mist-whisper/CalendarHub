/**
 * src/competitions/world-cup/team-mapper.js
 * 世界杯球队中文名与国旗 Emoji 完整映射表
 */

const TEAM_MAP = {
  // 欧洲区 (UEFA)
  'Germany': '🇩🇪 德国',
  'France': '🇫🇷 法国',
  'Spain': '🇪🇸 西班牙',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿 英格兰',
  'Portugal': '🇵🇹 葡萄牙',
  'Netherlands': '🇳🇱 荷兰',
  'Italy': '🇮🇹 意大利',
  'Croatia': '🇭🇷 克罗地亚',
  'Belgium': '🇧🇪 比利时',
  'Denmark': '🇩🇰 丹麦',
  'Switzerland': '🇨🇭 瑞士',
  'Serbia': '🇷🇸 塞尔维亚',
  'Poland': '🇵🇱 波兰',
  'Austria': '🇦🇹 奥地利',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿 苏格兰',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿 威尔士',
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

  // 南美洲区 (CONMEBOL)
  'Argentina': '🇦🇷 阿根廷',
  'Brazil': '🇧🇷 巴西',
  'Uruguay': '🇺🇾 乌拉圭',
  'Colombia': '🇨🇴 哥伦比亚',
  'Ecuador': '🇪🇨 厄瓜多尔',
  'Chile': '🇨🇱 智利',
  'Peru': '🇵🇪 秘鲁',
  'Paraguay': '🇵🇾 巴拉圭',
  'Venezuela': '🇻🇪 委内瑞拉',
  'Bolivia': '🇧🇴 玻利维亚',

  // 中北美及加勒比海区 (CONCACAF)
  'USA': '🇺🇸 美国',
  'United States': '🇺🇸 美国',
  'Mexico': '🇲🇽 墨西哥',
  'Canada': '🇨🇦 加拿大',
  'Costa Rica': '🇨🇷 哥斯达黎加',
  'Panama': '🇵🇦 巴拿马',
  'Jamaica': '🇯🇲 牙买加',
  'Honduras': '🇭🇳 洪都拉斯',

  // 亚洲区 (AFC)
  'Japan': '🇯🇵 日本',
  'South Korea': '🇰🇷 韩国',
  'Korea Republic': '🇰🇷 韩国',
  'Iran': '🇮🇷 伊朗',
  'Australia': '🇦🇺 澳大利亚',
  'Saudi Arabia': '🇸🇦 沙特阿拉伯',
  'Qatar': '🇶🇦 卡塔尔',
  'Iraq': '🇮🇶 伊拉克',
  'United Arab Emirates': '🇦🇪 阿联酋',
  'Uzbekistan': '🇺🇿 乌兹别克斯坦',
  'Jordan': '🇯🇴 约旦',
  'China': '🇨🇳 中国',

  // 非洲区 (CAF)
  'Morocco': '🇲🇦 摩洛哥',
  'Senegal': '🇸🇳 塞内加尔',
  'Tunisia': '🇹🇳 突尼斯',
  'Cameroon': '🇨🇲 喀麦隆',
  'Ghana': '🇬🇭 加纳',
  'Egypt': '🇪🇬 埃及',
  'Algeria': '🇩🇿 阿尔及利亚',
  'Nigeria': '🇳🇬 尼日利亚',
  'Ivory Coast': '🇨🇮 科特迪瓦',
  'Mali': '🇲🇱 马里',
  'South Africa': '🇿🇦 南非',

  // 大洋洲区 (OFC)
  'New Zealand': '🇳🇿 新西兰'
};

/**
 * 翻译球队名称
 * @param {string} englishName API 返回的原始球队名称
 * @returns {string} 带有 Emoji 的中文名称
 */
function getTranslatedTeamName(englishName) {
  if (!englishName) return '待定';

  // 1. 如果在字典里有直接匹配，直接返回
  if (TEAM_MAP[englishName]) {
    return TEAM_MAP[englishName];
  }

  // 2. 淘汰赛占位符解析（如 Winner Group A -> A组第一）
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

  // 3. 兜底策略：如果是未知球队，加个通用白旗前缀
  return `🏳️ ${englishName}`;
}

module.exports = {
  getTranslatedTeamName
};

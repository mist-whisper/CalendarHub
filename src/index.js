/**
 * src/index.js
 * CalendarHub 总指挥脚本：自动扫描 src/competitions/ 下的所有赛事模块并构建 .ics 订阅文件
 */

const fs = require('fs');
const path = require('path');
const { buildICalendar } = require('./core/ical-builder');

// 定义关键目录路径
const COMPETITIONS_DIR = path.join(__dirname, 'competitions');
const DIST_DIR = path.join(__dirname, '../dist');

async function main() {
  console.log('🚀 [CalendarHub] 开始构建全量赛事日历...\n');

  // 1. 确保产物目录 dist/ 存在
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
    console.log(`📁 创建产物目录: ${DIST_DIR}`);
  }

  // 2. 检查 competitions 目录是否存在
  if (!fs.existsSync(COMPETITIONS_DIR)) {
    console.error(`❌ [错误] 找不到 competitions 目录: ${COMPETITIONS_DIR}`);
    process.exit(1);
  }

  // 3. 读取 competitions 目录下的所有子文件夹
  const entries = fs.readdirSync(COMPETITIONS_DIR, { withFileTypes: true });
  const competitionFolders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  if (competitionFolders.length === 0) {
    console.warn('⚠️ competitions/ 目录下没有任何赛事子文件夹！');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // 4. 遍历每个赛事文件夹
  for (const folder of competitionFolders) {
    const compDir = path.join(COMPETITIONS_DIR, folder);
    const configPath = path.join(compDir, 'config.json');
    const fetcherPath = path.join(compDir, 'fetcher.js');

    console.log(`----------------------------------------`);
    console.log(`🔍 正在检查模块: [${folder}]`);

    // 检查必需的配置文件 config.json
    if (!fs.existsSync(configPath)) {
      console.warn(`  ⚠️ 跳过：缺少 config.json 配置文件`);
      continue;
    }

    try {
      // 读取配置
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // 检查开关状态
      if (config.enabled === false) {
        console.log(`  ⏸️ 已禁用 (enabled: false)，跳过处理。`);
        continue;
      }

      const outputFile = config.outputFile || `${folder}.ics`;
      const outputPath = path.join(DIST_DIR, outputFile);

      // 💡 优先拦截归档逻辑：如果是已归档赛事，直接复制本地静态文件到 dist/
      if (config.archived) {
        const archiveFile = config.archiveFile || `${folder}-archive.ics`;
        const archivePath = path.join(compDir, archiveFile);

        if (fs.existsSync(archivePath)) {
          fs.copyFileSync(archivePath, outputPath);
          console.log(`  📦 [静态归档] 成功复制归档文件: ${archiveFile} -> dist/${outputFile}`);
          successCount++;
          continue; // 处理完毕，直接跳过后续的 API 请求
        } else {
          console.warn(`  ⚠️ 开启了归档模式但未找到文件 ${archivePath}，尝试降级为动态抓取...`);
        }
      }

      // --- 动态抓取与构建流程 ---
      // 检查必需的抓取模块 fetcher.js
      if (!fs.existsSync(fetcherPath)) {
        console.warn(`  ⚠️ 跳过：缺少 fetcher.js 模块`);
        continue;
      }

      console.log(`  📌 赛事名称: ${config.name}`);
      console.log(`  🌐 正在拉取动态数据...`);

      // 动态导入该赛事的 fetcher 模块
      const fetcher = require(fetcherPath);

      // 调用 fetcher 拿回清洗好的标准比赛列表
      const matches = typeof fetcher.fetchMatches === 'function'
        ? await fetcher.fetchMatches(config)
        : await fetcher(config);

      console.log(`  ✅ 成功获取 ${matches.length} 场比赛记录`);

      // 5. 调用核心引擎生成 .ics 文本
      const icalContent = buildICalendar({
        calName: config.name,
        matches
      });

      // 6. 写入到 dist/ 对应的 .ics 文件中
      fs.writeFileSync(outputPath, icalContent, 'utf-8');
      console.log(`  🎉 成功生成文件: dist/${outputFile}`);

      successCount++;
    } catch (error) {
      failCount++;
      console.error(`  ❌ [构建失败] 模块 [${folder}] 发生错误:`, error.message);
    }
  }

  console.log(`\n----------------------------------------`);
  console.log(`🏁 [CalendarHub] 全量构建完成！成功: ${successCount} 个, 失败: ${failCount} 个`);
}

// 启动执行
main().catch(err => {
  console.error('💥 [FATAL] 进程异常退出:', err);
  process.exit(1);
});

/**
 * src/index.js
 * CalendarHub 总指挥脚本
 * 
 * 功能亮点：
 * 1. 递归自动扫描 competitions/ 下的所有嵌套目录 (例如 competitions/euro/euro-2024)
 * 2. 支持 🟢 实时 (Live) / ⏳ 待定 (Upcoming) / 📦 归档 (Archived) 三种状态模式
 * 3. 自动根据赛事状态与年份进行智能动态排序 (Live > Upcoming > Archived)
 * 4. 自动继承父级 Fetcher 抓取脚本，减少重复代码
 * 5. 自动构建漂亮的 index.html 静态订阅主页 (含 ⚽ 矢量 Favicon)
 */

const fs = require('fs');
const path = require('path');
const { buildICalendar } = require('./core/ical-builder');

const COMPETITIONS_DIR = path.join(__dirname, 'competitions');
const DIST_DIR = path.join(__dirname, '../dist');

/**
 * 递归扫描指定目录下的所有赛事目录（只要包含 config.json 即视为一个赛事模块）
 * @param {string} baseDir 扫描起始路径
 * @returns {Array<string>} 所有包含 config.json 的绝对路径列表
 */
function findAllCompetitionDirs(baseDir) {
  let results = [];
  if (!fs.existsSync(baseDir)) return results;

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(baseDir, entry.name);
      const configPath = path.join(fullPath, 'config.json');

      // 如果当前目录下直接有 config.json，说明是一个具体的赛事模块
      if (fs.existsSync(configPath)) {
        results.push(fullPath);
      }
      
      // 递归向下寻找子目录（支持多级嵌套目录）
      results = results.concat(findAllCompetitionDirs(fullPath));
    }
  }

  return results;
}

async function main() {
  console.log('🚀 [CalendarHub] 开始构建全量赛事日历...\n');

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // 1. 递归扫描获取所有赛事模块路径
  const compDirs = findAllCompetitionDirs(COMPETITIONS_DIR);

  if (compDirs.length === 0) {
    console.warn('⚠️ competitions/ 目录下未扫描到任何包含 config.json 的赛事模块！');
    return;
  }

  let successCount = 0;
  let failCount = 0;
  const generatedCompetitions = [];

  for (const compDir of compDirs) {
    const relativeFolder = path.relative(COMPETITIONS_DIR, compDir);
    const folderName = path.basename(compDir);
    const configPath = path.join(compDir, 'config.json');

    console.log(`----------------------------------------`);
    console.log(`🔍 正在检查模块: [${relativeFolder}]`);

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      if (config.enabled === false) {
        console.log(`  ⏸️ 已禁用 (enabled: false)，跳过处理。`);
        continue;
      }

      const outputFile = config.outputFile || `${folderName}.ics`;
      const outputPath = path.join(DIST_DIR, outputFile);

      // 1. 拦截待定/筹备中赛事 (upcoming: true)
      if (config.upcoming) {
        console.log(`  ⏳ [赛程待定] 暂时不开放订阅拉取。`);
        generatedCompetitions.push({
          id: config.id || folderName,
          name: config.name || folderName,
          outputFile,
          upcoming: true,
          order: config.order
        });
        successCount++;
        continue;
      }

      // 2. 静态归档处理 (archived: true)
      if (config.archived) {
        const possibleArchiveFiles = [
          config.archiveFile,
          `${folderName}.ics`,
          `${folderName}-archive.ics`,
          'world-cup.ics',
          'euro.ics'
        ].filter(Boolean);

        let foundArchivePath = null;
        let actualArchiveFileName = '';

        for (const fileName of possibleArchiveFiles) {
          const testPath = path.join(compDir, fileName);
          if (fs.existsSync(testPath)) {
            foundArchivePath = testPath;
            actualArchiveFileName = fileName;
            break;
          }
        }

        if (foundArchivePath) {
          fs.copyFileSync(foundArchivePath, outputPath);
          console.log(`  📦 [静态归档] 成功复制归档文件: ${actualArchiveFileName} -> dist/${outputFile}`);
          
          generatedCompetitions.push({
            id: config.id || folderName,
            name: config.name || folderName,
            outputFile,
            archived: true,
            order: config.order
          });

          successCount++;
          continue;
        } else {
          console.error(`  ❌ [归档失败] 模块 [${relativeFolder}] 开启了 archived，但找不到对应的 .ics 归档文件！`);
          failCount++;
          continue;
        }
      }

      // 3. 动态抓取处理（智能查找 fetcher.js：优先子目录，找不到自动退回父目录）
      let fetcherPath = path.join(compDir, 'fetcher.js');
      if (!fs.existsSync(fetcherPath)) {
        const parentFetcherPath = path.join(path.dirname(compDir), 'fetcher.js');
        if (fs.existsSync(parentFetcherPath)) {
          fetcherPath = parentFetcherPath;
          console.log(`  💡 自动继承父级抓取脚本: ${path.relative(COMPETITIONS_DIR, parentFetcherPath)}`);
        }
      }

      if (!fs.existsSync(fetcherPath)) {
        console.warn(`  ⚠️ 跳过：模块 [${relativeFolder}] 既非归档/待定，又未找到 fetcher.js 脚本`);
        continue;
      }

      console.log(`  📌 赛事名称: ${config.name}`);
      console.log(`  🌐 正在拉取动态数据...`);

      const fetcher = require(fetcherPath);
      const matches = typeof fetcher.fetchMatches === 'function'
        ? await fetcher.fetchMatches(config)
        : await fetcher(config);

      const icalContent = buildICalendar({
        calName: config.name,
        matches
      });

      fs.writeFileSync(outputPath, icalContent, 'utf-8');
      console.log(`  🎉 成功生成文件: dist/${outputFile}`);

      generatedCompetitions.push({
        id: config.id || folderName,
        name: config.name || folderName,
        outputFile,
        archived: false,
        matchCount: matches.length,
        order: config.order
      });

      successCount++;
    } catch (error) {
      failCount++;
      console.error(`  ❌ [解析/构建失败] 模块 [${relativeFolder}] 发生错误:`, error.message);
    }
  }

  // 2. 智能动态排序逻辑 (Live > Upcoming > Archived，同状态按年份排序)
  if (generatedCompetitions.length > 0) {
    generatedCompetitions.sort((a, b) => {
      // ① 手动指定 order 权重最高 (数字越小越靠前)
      if (a.order !== undefined || b.order !== undefined) {
        return (a.order ?? 99) - (b.order ?? 99);
      }

      // ② 状态优先级权重：🟢 实时 (0) > ⏳ 待定 (1) > 📦 归档 (2)
      const getStatusWeight = (comp) => {
        if (!comp.upcoming && !comp.archived) return 0;
        if (comp.upcoming) return 1;
        return 2;
      };

      const weightA = getStatusWeight(a);
      const weightB = getStatusWeight(b);

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // ③ 提取标题中的年份进行同状态二次排序
      const yearA = parseInt((a.name.match(/\d{4}/) || [0])[0], 10);
      const yearB = parseInt((b.name.match(/\d{4}/) || [0])[0], 10);

      if (a.archived) {
        return yearB - yearA; // 归档赛事：按年份倒序，较新的排前面 (如 2026 > 2024)
      } else {
        return yearA - yearB; // 实时/待定：按年份正序，最近要踢的排前面 (如 2028 < 2030)
      }
    });

    generateIndexHtml(generatedCompetitions);
  }

  console.log(`\n----------------------------------------`);
  console.log(`🏁 [CalendarHub] 全量构建完成！成功: ${successCount} 个, 失败: ${failCount} 个`);
}

/**
 * 自动生成网页端订阅导航页 index.html
 */
function generateIndexHtml(competitions) {
  const htmlPath = path.join(DIST_DIR, 'index.html');

  const cardsHtml = competitions.map(comp => {
    let badge = '';
    let actionsHtml = '';

    if (comp.upcoming) {
      badge = `<span class="badge badge-upcoming">⏳ 赛程待定</span>`;
      actionsHtml = `
        <button class="btn btn-disabled" disabled>
          🔒 预选赛/抽签中 · 暂未开放订阅
        </button>
      `;
    } else if (comp.archived) {
      badge = `<span class="badge badge-archive">📦 历史归档</span>`;
      actionsHtml = `
        <a class="btn btn-primary btn-webcal" href="#" target="_blank">
          📅 一键唤起系统日历 (webcal)
        </a>
        <button class="btn btn-secondary btn-copy">
          📋 复制订阅链接
        </button>
        <a class="btn btn-link btn-download" href="./${comp.outputFile}" download>
          ⬇️ 下载 .ics 文件
        </a>
      `;
    } else {
      badge = `<span class="badge badge-live">🟢 实时同步 (${comp.matchCount || 0} 场)</span>`;
      actionsHtml = `
        <a class="btn btn-primary btn-webcal" href="#" target="_blank">
          📅 一键唤起系统日历 (webcal)
        </a>
        <button class="btn btn-secondary btn-copy">
          📋 复制订阅链接
        </button>
        <a class="btn btn-link btn-download" href="./${comp.outputFile}" download>
          ⬇️ 下载 .ics 文件
        </a>
      `;
    }

    return `
      <div class="card" data-filename="${comp.outputFile}">
        <div class="card-header">
          <h3>${comp.name}</h3>
          ${badge}
        </div>
        <p class="file-info">订阅文件：<code>${comp.outputFile}</code></p>
        <div class="card-actions">
          ${actionsHtml}
        </div>
      </div>
    `;
  }).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CalendarHub - 体育赛事日历订阅中心</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚽</text></svg>">
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: #1e293b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0284c7;
      --secondary: #334155;
      --secondary-hover: #475569;
      --accent-green: #22c55e;
      --accent-amber: #f59e0b;
      --accent-slate: #64748b;
      --border-color: #334155;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }

    header {
      text-align: center;
      margin-bottom: 2.5rem;
      max-width: 600px;
    }
    header h1 {
      font-size: 2.25rem;
      font-weight: 800;
      background: linear-gradient(to right, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }
    header p {
      color: var(--text-muted);
      font-size: 1rem;
      line-height: 1.5;
    }

    .container {
      width: 100%;
      max-width: 800px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 640px) {
      .container { grid-template-columns: repeat(2, 1fr); }
    }

    .card {
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .card-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
      white-space: nowrap;
    }
    .badge-live {
      background-color: rgba(34, 197, 94, 0.15);
      color: var(--accent-green);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .badge-archive {
      background-color: rgba(245, 158, 11, 0.15);
      color: var(--accent-amber);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-upcoming {
      background-color: rgba(100, 116, 139, 0.2);
      color: var(--accent-slate);
      border: 1px solid rgba(100, 116, 139, 0.4);
    }

    .file-info {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 1.25rem;
    }
    .file-info code {
      background: rgba(0, 0, 0, 0.2);
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      font-family: monospace;
    }

    .card-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: background-color 0.2s;
    }
    .btn-primary {
      background-color: var(--primary);
      color: #0f172a;
    }
    .btn-primary:hover { background-color: var(--primary-hover); }
    
    .btn-secondary {
      background-color: var(--secondary);
      color: var(--text-main);
    }
    .btn-secondary:hover { background-color: var(--secondary-hover); }

    .btn-disabled {
      background-color: rgba(51, 65, 85, 0.5);
      color: var(--text-muted);
      border: 1px dashed var(--border-color);
      cursor: not-allowed;
    }

    .btn-link {
      background: transparent;
      color: var(--text-muted);
      font-size: 0.8rem;
    }
    .btn-link:hover { color: var(--text-main); }

    .toast {
      position: fixed;
      bottom: 2rem;
      background: var(--primary);
      color: #0f172a;
      padding: 0.75rem 1.5rem;
      border-radius: 9999px;
      font-weight: 600;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transform: translateY(100%);
      transition: opacity 0.3s, transform 0.3s;
      pointer-events: none;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>

  <header>
    <h1>🏆 CalendarHub 订阅中心</h1>
    <p>实时更新、无缝同步的体育赛事 iCal 日历服务。点击按钮即可一键添加至 Apple Calendar、Outlook 或 Google Calendar。</p>
  </header>

  <main class="container">
    ${cardsHtml}
  </main>

  <div id="toast" class="toast">已复制订阅链接到剪贴板！</div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const origin = window.location.origin;
      const pathname = window.location.pathname.replace(/\\/index\\.html$/, '').replace(/\\/$/, '');
      const httpBaseUrl = origin + pathname;
      const webcalBaseUrl = httpBaseUrl.replace(/^https?:/, 'webcal:');

      const toast = document.getElementById('toast');

      function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
      }

      document.querySelectorAll('.card').forEach(card => {
        const fileName = card.dataset.filename;
        const httpUrl = \`\${httpBaseUrl}/\${fileName}\`;
        const webcalUrl = \`\${webcalBaseUrl}/\${fileName}\`;

        const webcalBtn = card.querySelector('.btn-webcal');
        if (webcalBtn) {
          webcalBtn.href = webcalUrl;
        }

        const copyBtn = card.querySelector('.btn-copy');
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(httpUrl).then(() => {
              showToast('✅ 链接已复制！贴入日历软件即可订阅');
            }).catch(() => {
              showToast('❌ 复制失败，请手动复制链接');
            });
          });
        }
      });
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`\n🌐 [HTML 主页] 成功生成: dist/index.html`);
}

main().catch(err => {
  console.error('💥 [FATAL] 进程异常退出:', err);
  process.exit(1);
});

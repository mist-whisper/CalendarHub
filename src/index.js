/**
 * src/index.js
 * CalendarHub 总指挥脚本：构建全量赛事日历并自动生成 HTML 导航订阅页
 */

const fs = require('fs');
const path = require('path');
const { buildICalendar } = require('./core/ical-builder');

const COMPETITIONS_DIR = path.join(__dirname, 'competitions');
const DIST_DIR = path.join(__dirname, '../dist');

async function main() {
  console.log('🚀 [CalendarHub] 开始构建全量赛事日历...\n');

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
    console.log(`📁 创建产物目录: ${DIST_DIR}`);
  }

  if (!fs.existsSync(COMPETITIONS_DIR)) {
    console.error(`❌ [错误] 找不到 competitions 目录: ${COMPETITIONS_DIR}`);
    process.exit(1);
  }

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
  // 💡 用于记录成功构建的赛事元数据，以便生成 index.html
  const generatedCompetitions = [];

  for (const folder of competitionFolders) {
    const compDir = path.join(COMPETITIONS_DIR, folder);
    const configPath = path.join(compDir, 'config.json');
    const fetcherPath = path.join(compDir, 'fetcher.js');

    console.log(`----------------------------------------`);
    console.log(`🔍 正在检查模块: [${folder}]`);

    if (!fs.existsSync(configPath)) {
      console.warn(`  ⚠️ 跳过：缺少 config.json 配置文件`);
      continue;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      if (config.enabled === false) {
        console.log(`  ⏸️ 已禁用 (enabled: false)，跳过处理。`);
        continue;
      }

      const outputFile = config.outputFile || `${folder}.ics`;
      const outputPath = path.join(DIST_DIR, outputFile);

      // 1. 静态归档处理
      if (config.archived) {
        const archiveFile = config.archiveFile || `${folder}-archive.ics`;
        const archivePath = path.join(compDir, archiveFile);

        if (fs.existsSync(archivePath)) {
          fs.copyFileSync(archivePath, outputPath);
          console.log(`  📦 [静态归档] 成功复制归档文件: ${archiveFile} -> dist/${outputFile}`);
          
          generatedCompetitions.push({
            id: config.id || folder,
            name: config.name || folder,
            outputFile,
            archived: true
          });

          successCount++;
          continue;
        } else {
          console.warn(`  ⚠️ 未找到归档文件 ${archivePath}，尝试降级为动态抓取...`);
        }
      }

      // 2. 动态抓取与构建处理
      if (!fs.existsSync(fetcherPath)) {
        console.warn(`  ⚠️ 跳过：缺少 fetcher.js 模块`);
        continue;
      }

      console.log(`  📌 赛事名称: ${config.name}`);
      console.log(`  🌐 正在拉取动态数据...`);

      const fetcher = require(fetcherPath);
      const matches = typeof fetcher.fetchMatches === 'function'
        ? await fetcher.fetchMatches(config)
        : await fetcher(config);

      console.log(`  ✅ 成功获取 ${matches.length} 场比赛记录`);

      const icalContent = buildICalendar({
        calName: config.name,
        matches
      });

      fs.writeFileSync(outputPath, icalContent, 'utf-8');
      console.log(`  🎉 成功生成文件: dist/${outputFile}`);

      generatedCompetitions.push({
        id: config.id || folder,
        name: config.name || folder,
        outputFile,
        archived: false,
        matchCount: matches.length
      });

      successCount++;
    } catch (error) {
      failCount++;
      console.error(`  ❌ [构建失败] 模块 [${folder}] 发生错误:`, error.message);
    }
  }

  // 3. 自动生成 HTML 订阅主页
  if (generatedCompetitions.length > 0) {
    generateIndexHtml(generatedCompetitions);
  }

  console.log(`\n----------------------------------------`);
  console.log(`🏁 [CalendarHub] 全量构建完成！成功: ${successCount} 个, 失败: ${failCount} 个`);
}

/**
 * 自动生成漂亮的 HTML 订阅主页
 */
function generateIndexHtml(competitions) {
  const htmlPath = path.join(DIST_DIR, 'index.html');

  const cardsHtml = competitions.map(comp => {
    const badge = comp.archived
      ? `<span class="badge badge-archive">📦 历史归档</span>`
      : `<span class="badge badge-live">🟢 实时同步 (${comp.matchCount || 0} 场)</span>`;

    return `
      <div class="card" data-filename="${comp.outputFile}">
        <div class="card-header">
          <h3>${comp.name}</h3>
          ${badge}
        </div>
        <p class="file-info">订阅文件：<code>${comp.outputFile}</code></p>
        <div class="card-actions">
          <a class="btn btn-primary btn-webcal" href="#" target="_blank">
            📅 一键唤起系统日历 (webcal)
          </a>
          <button class="btn btn-secondary btn-copy">
            📋 复制订阅链接
          </button>
          <a class="btn btn-link btn-download" href="./${comp.outputFile}" download>
            ⬇️ 下载 .ics 文件
          </a>
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

  <!-- ⚽ 足球 Emoji 动态 Favicon (SVG Data URI) -->
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
      // 动态获取当前页面的基础 URL 路径
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

      // 遍历所有卡片，绑定全动态的 webcal:// 和复制事件
      document.querySelectorAll('.card').forEach(card => {
        const fileName = card.dataset.filename;
        const httpUrl = \`\${httpBaseUrl}/\${fileName}\`;
        const webcalUrl = \`\${webcalBaseUrl}/\${fileName}\`;

        // 1. 设置 webcal 一键唤起链接
        const webcalBtn = card.querySelector('.btn-webcal');
        if (webcalBtn) {
          webcalBtn.href = webcalUrl;
        }

        // 2. 设置复制按钮逻辑
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

# 🏆 CalendarHub

> 自动化、轻量化的体育赛事 iCal 日历订阅中心 & 导航主页。

**CalendarHub** 是一个基于 Node.js 开发的体育赛事日历服务生成器。支持动态赛事抓取、历史赛事静态归档与筹备中赛事占位管理，并在构建时自动生成精美的深色主题订阅网页，提供一键唤起系统日历 (`webcal://`) 及订阅链接复制功能。

[![Domain](https://img.shields.io/badge/订阅主页-calendar.wuyra.com-38bdf8?style=for-the-badge&logo=googlecalendar&logoColor=white)](https://calendar.wuyra.com)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-22c55e?style=for-the-badge&logo=nodedotjs)
![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)

---

## 🌐 在线订阅中心

👉 **官方订阅主页**：[https://calendar.wuyra.com](https://calendar.wuyra.com)

支持在 iOS / macOS (Apple Calendar)、Android、Outlook 或 Google Calendar 中一键直接订阅：

| 赛事分类 | 状态 | HTTP 订阅地址 | webcal 一键唤起 |
| :--- | :---: | :--- | :--- |
| **2026 美加墨世界杯** | 📦 历史归档 | `https://calendar.wuyra.com/world-cup-2026.ics` | `webcal://calendar.wuyra.com/world-cup-2026.ics` |
| **2024 德国欧洲杯** | 📦 历史归档 | `https://calendar.wuyra.com/euro-2024.ics` | `webcal://calendar.wuyra.com/euro-2024.ics` |
| **2028 英国&爱尔兰欧洲杯** | ⏳ 赛程待定 | *抽签中 · 暂未开放* | - |
| **2030 西葡摩世界杯** | ⏳ 赛程待定 | *预选赛中 · 暂未开放* | - |

---

## ✨ 核心特性

- 🟢 **多状态生命周期管理**：
  - **Live（实时同步）**：自动拉取最新 API 数据，动态同步比分与赛程变更。
  - **Archived（历史归档）**：托管 `.ics` 静态归档文件，实现 0 API 开销与永久沉淀。
  - **Upcoming（赛程待定）**：对于抽签或时间未定的未来赛事显示预警锁，防止无效订阅。
- 📂 **多级嵌套目录扫描**：支持按赛事类型与年份多层级整理（如 `competitions/euro/euro-2024/`），脚本自动递归解析。
- 💡 **智能 Fetcher 继承机制**：子赛事模块可自动继承上级目录的 `fetcher.js` 抓取脚本，减少重复代码。
- 📊 **智能动态卡片重排**：构建时自动按 **实时同步 > 赛程待定 > 历史归档** 优先级及赛事年份重排网页卡片。
- 🌐 **全自动网页生成**：构建脚本自包含暗黑风格导航主页生成器，基于纯前端解析动态生成 `webcal://` 唤起协议，零配置适配 `calendar.wuyra.com`。

---

## 📁 项目结构

```text
CalendarHub/
├── .github/
│   └── workflows/
│       └── update-calendar.yml # GitHub Actions 自动构建与发布工作流 (含 CNAME 配置)
├── dist/                       # 打包产物目录 (.ics 文件及 index.html)
├── src/
│   ├── competitions/           # 赛事配置与数据目录
│   │   ├── euro/
│   │   │   ├── euro-2024/      # 2024 欧洲杯 (静态归档)
│   │   │   ├── euro-2028/      # 2028 欧洲杯 (赛程待定)
│   │   │   ├── fetcher.js      # 欧洲杯共享抓取器
│   │   │   └── team-mapper.js  # 球队名称汉化映射
│   │   └── world-cup/
│   │       ├── world-cup-2026/ # 2026 世界杯 (静态归档)
│   │       └── world-cup-2030/ # 2030 世界杯 (赛程待定)
│   ├── core/                   # 核心工具库
│   │   ├── football-data-fetcher.js
│   │   ├── http-client.js
│   │   ├── ical-builder.js     # iCal 协议格式化生成器
│   │   └── time-utils.js
│   └── index.js                # 总指挥构建脚本 & HTML 模版引擎
├── package.json
└── README.md

# AGENTS.md

本仓库的全局开发规则（源自 issue #30），所有贡献者（包括 AI agent）都必须遵守。

## Commit 规范

1. **commit message 必须有意义**：写清楚改了什么、为什么改，不要写 "fix"、"update" 这种空话。
2. **按意群组织 commit**：一个逻辑改动一个 commit，不要把不相关的改动塞进同一个 commit。

## PR 流程

3. **任何改动都走 PR**，由 lordstone 审核后 merge。不要直接 push 到 main，更不要自己 merge。
4. **PR 描述必须附带浏览器实测截图**：证明功能完整（feature complete）或 bug 确实被修复。UI 改动必须在真实浏览器里走实际操作流程渲染验证，截图为证，不能只靠读代码推断。
5. **PR 要加上相应的 label**（如"开发原则"）。

## 版本与 Changelog

6. **README 顶部的 changelog 按倒序排列**：新版本在上，旧版本在下。
7. **版本号规则（semver）**：
   - 小的 fix 只改 patch version（如 1.16.7 → 1.16.8）；
   - 大的玩法变动改 minor version（如 1.16.x → 1.17.0）；
   - 大的架构变动（如引入新的对战模式、web service 等）改 major version（如 1.x → 2.0.0）。

## 每个 PR 的标准动作

- **bump version**：`package.json` 的 `version`、`index.html` 的版本徽章／aria-label／`?v=`、README 的版本徽章，三处保持一致。
- **README 顶部加 changelog**：倒序，新条目写在最上面。
- **重建离线单文件**：改动源码后执行 `node build.mjs` 重建 `暗线战争.html`（发布产物，绝不能忘记）。

## 构建与测试

```bash
node build.mjs              # 重建离线单文件 暗线战争.html
node server.mjs             # 本地服务 http://127.0.0.1:4173
npm test                    # engine + events 单元测试
npm run test:bundle         # 单文件完整性校验
```

UI 改动在开 PR 之前，必须用无头 Chromium（CDP）加载重建后的 `暗线战争.html` 走真实流程验证：截图、关键边界测量，必要时做旧行为对照。

## 项目结构

- `src/`：`app.js`（UI 与游戏流程）、`engine.js`（规则引擎）、`data.js`（地图／卡牌数据）、`battlefield.js`、`events.js`、`map-geography.js`、`style.css`。
- `tests/`：`engine.test.mjs`、`events.test.mjs`、`browser.test.mjs`（E2E 流程用例）、`bundle.test.mjs`（单文件校验）。
- `暗线战争.html`：离线单文件发布产物，由 `build.mjs` 生成，不要手改。

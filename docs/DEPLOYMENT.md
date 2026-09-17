# Pages 部署

GitHub Pages 由 `main` 分支上唯一的 `.github/workflows/pages.yml` 组装。发布物包含三类入口：

- `/`：正式版；
- `/preview/`：预览版；
- `/versions/<minor>/`：指定 minor 系列的可玩快照，`/versions/` 是选择页。

## 持久切换渠道

修改 `deploy/channels.json` 中的 `release` 或 `preview`，值可以是 branch、tag 或完整 commit SHA。这种切换会留下 Git 记录，后续每次部署都继续使用该来源。

`versions` 列表的 `slug` 必须是 `major.minor`，`ref` 建议使用 tag 或完整 SHA，避免历史版本随分支变动。当前开发 minor 可以指向 `main`。

## 临时部署

在 GitHub Actions 打开 **Deploy configurable Pages channels** 并选择 **Run workflow**，可填写 `release_ref` 或 `preview_ref`。空值使用 `deploy/channels.json`。手动输入只对该次部署生效；下次 `main` 推送会恢复配置文件的值。

## 安全与验证

- ref 仅允许安全的 Git 名称字符，并在组装前验证必须解析为 commit。
- release 和 preview 会并行执行各自版本的 `npm test`、`npm run build` 和 `npm run test:bundle`。
- `git diff --exit-code` 保证离线单文件已随源码提交。
- 部署物只复制 `index.html`、manifest、`assets/`、`src/`、`vendor/` 与当前渠道的离线 HTML。
- `deployment.json` 记录每个入口的 ref、commit SHA 和版本号，用于排查缓存或部署来源。

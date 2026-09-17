# 游戏数值配置

`game-balance.yaml` 是玩法数值的唯一人工维护入口，采用 YAML 1.2 兼容的 JSON 写法，避免在构建阶段引入第三方解析器。

修改后运行：

```bash
npm run config:generate
npm test
```

生成的 `src/game-config.js` 供浏览器、规则引擎和离线单文件共同使用，不应手工修改。`npm test` 会检查生成文件是否与 YAML 完全同步。

配置范围包括默认对局选项、发牌、战役经济、驻军与战线限制，以及策略牌数量、价格和数值效果。地图拓扑仍由 `src/data.js` 管理；UI 尺寸、随机算法常数和 AI 估值权重不属于玩法配置。

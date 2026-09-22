# 游戏数据配置

`game-balance.yaml` 和 `maps.yaml` 是玩法数据的人工维护入口，采用 YAML 1.2 兼容的 JSON 写法，避免在构建阶段引入第三方解析器。

修改后运行：

```bash
npm run config:generate
npm run maps:generate
npm test
```

生成的 `src/game-config.js` 与 `src/map-config.js` 供浏览器、规则引擎和离线单文件共同使用，不应手工修改。`npm test` 会检查生成文件是否与 YAML 完全同步。

`game-balance.yaml` 管理默认对局选项、发牌、战役经济、驻军与战线限制，以及策略牌价格和数值效果。`maps.yaml` 管理地图据点、坐标、双向拓扑、跨海路线、史实控制区、阵营标记、史实策略牌，以及每张地图在经典／战役模式中的策略候选权重；生成器会拒绝断图、单向边、悬空边、重复 ID、越界坐标、不完整的史实控制区，以及缺失、重复或模式不兼容的策略权重。UI 尺寸、随机算法常数和 AI 估值权重不属于玩法配置。

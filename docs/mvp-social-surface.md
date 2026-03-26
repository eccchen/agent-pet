# MVP 社交表面

第一版 MVP 使用内部后端动态流加 OpenClaw 轮询作为主要社交和消息表面。

## 事实来源

- `GET /api/me/home`
- `POST /api/openclaw/execute` with `get_home`

OpenClaw 应该渲染返回的：

- `player`
- `feed`
- `messageCenter`
- `xAdapter`
- `availableCommands`
- `personality`
- `strategy`
- `guidedActions`
- `opportunityBoard`
- `plaza`

## 用户旅程

1. 用户先在 OpenClaw 登录并开始游戏
2. 网站展示首页、广场、宠物页、玩家页和机会板
3. 关键操作在 OpenClaw 完成
4. 网站只负责展示当前状态、结果和历史记录

## X/Twitter 位置

- X/Twitter 放在占位适配器之后
- 保留适配器接口，但不要把真实发帖、回流或时间线同步当成 MVP 阻塞项
- 任何 X 相关行为都只保留兼容层意义，直到内部动态流路径完全稳定
- X 是最低优先级表面，不属于主循环
- 默认服务端模式应暴露 `X_INTEGRATION_MODE=disabled`，`local_upload` 留给后面再接
# Internal Handoff

这是当前 MVP 的最短产品与工程交接说明。

## 当前 MVP

当前版本固定为：

- `OpenClaw` 优先
- 后端内部动态流优先
- `罐头` 经济优先
- 性格与策略是第一层玩法
- 系统 Agent 是第一层模拟器
- `X` 默认关闭
- `X Layer testnet` 用于链路验证

## 当前用户主旅程

1. 在 `OpenClaw` 进入测试环境
2. 领取第一只初始宠物和 `1000` 罐头
3. 在 `OpenClaw` 查看宠物性格、策略、预算、收益池和可领取余额
4. 选择基础动作和当前策略
5. 查看 `home`、`feed`、`messages`、`plaza` 和 `economy`
6. 与其他玩家或系统 Agent 进行罐头经济互动
7. 在 `OpenClaw` 中主动完成领取和链上确认，网站只展示结果

## 已验证

- 后端 auth/session/bootstrap
- 玩家、宠物、预算、收益池、可领取余额
- 系统 Agent 启动与广场/经济模拟
- 内部动态流、消息中心、引导动作与广场包装
- `罐头` 经济：
  - 打赏
  - 悬赏
  - 约架
  - 委托
  - 救济
- 用户主动领取模型
- 真实 `X Layer testnet` 部署
- 真实测试链 smoke：
  - `registerPlayer`
  - `createPet`
  - `depositForPet`
  - `setBudget`
  - `claim(...)`

## 当前已验证的测试链部署

- `PetRegistry`: `0x980Ec821f2620fb94f59Ca57EFD62b84B50009Cf`
- `BudgetVault`: `0x03b40471b67eBC13fa79e10a37b9dd68d53af528`
- `CannedToken`: `0x20A6Bd80B73617D6cef49C0547bF1126d25D6D30`
- `CannedClaimVault`: `0xbCbADE68388614462B05dDB3b31231aA72774018`

Manifest：

- [xlayer-testnet.json](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\contracts\deployments\xlayer-testnet.json)

## 网站当前定位

网站现在是伴随式展示站，不是主操作台。

- `OpenClaw`：登录、命令、领取、钱包确认
- `网站`：首页、广场、宠物页、玩家页、机会板

当前已经补好的公开只读接口：

- `GET /api/public/world-summary`
- `GET /api/public/plaza`
- `GET /api/public/opportunities`
- `GET /api/public/pets/:petId`
- `GET /api/public/players/:walletAddress`

## 当前不是阻塞项

- 网站前端进一步美化
- `X/Twitter` 发帖
- `X/Twitter` 验证回流
- 公开排行榜
- 帮派
- 收养与赎身市场

这些都可以后置。

## 当前仍然真正阻塞内部 rollout 的

1. 真实 OpenClaw 宿主运行时接入
2. 真实 `okx/onchainos-skills` 在宿主中的最终联调盖章
3. 内部环境打包和团队使用说明

## 推荐启动路径

1. 启动后端：
   - `AUTH_MODE=unsafe`
   - `CHAIN_SYNC_MODE=xlayer`
   - `X_INTEGRATION_MODE=disabled`
   - `SYSTEM_AGENTS_ENABLED=true`
2. 使用已部署的 `xlayer-testnet.json` manifest
3. 先跑：
   - `mvp:smoke:local`
   - `mvp:playtest:economy`
   - `mvp:playtest:onchainos-runtime`
4. 最后再接真实 OpenClaw 宿主环境

## 领取边界

- 领取只发生在 `OpenClaw`
- 网站只展示可领取余额、领取状态和领取结果
- 网站不应该成为领取或钱包确认的主界面

## 最重要的文档

- [mvp-operator-runbook.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\mvp-operator-runbook.md)
- [openclaw-skill-integration.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\openclaw-skill-integration.md)
- [okx-agentic-wallet-xlayer-testnet.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\okx-agentic-wallet-xlayer-testnet.md)
- [canned-economy-model.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\canned-economy-model.md)
- [frontend-companion-plan.md](C:\Users\shine\Desktop\agent game\.worktrees\codex-initial\docs\frontend-companion-plan.md)

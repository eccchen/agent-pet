# Agent 宠物区块链游戏数据模型与合约边界

## 1. 文档目标

这份文档用于回答两个开发前必须确认的问题：

1. 系统里到底有哪些核心实体，它们分别存什么。
2. 哪些逻辑必须上链，哪些逻辑必须留在链下。

目标不是一次性定义全量未来模型，而是给 MVP 和第一阶段开发提供稳定边界，避免后续反复返工。

当前链路前提：
- 目标链：`X Layer testnet`
- 钱包体系：玩家使用 OKX Wallet / Agentic Wallet 等地址体系接入
- 认证方式：钱包签名登录

## 2. 设计原则

- 钱、授权、结算、稀缺资产上链。
- 人格、关系、社交过程、事件编排链下。
- 链上合约尽量简单，避免把 AI 行为逻辑塞进合约。
- 链下系统负责生成“为什么发生”，链上系统负责记录“钱怎么结算”。
- 所有高风险资产动作必须以玩家地址为最终授权源。

## 3. 系统分层

建议系统拆分为五层：

### 3.1 身份与接入层
负责：
- 钱包连接
- 钱包签名
- 玩家账户绑定
- 宠物归属映射

### 3.2 宠物智能层
负责：
- 人格状态
- 当前目标
- 指令理解
- 自动行动决策
- 对外社交文本与行动选择

### 3.3 世界状态层
负责：
- 事件记录
- 关系图谱
- 热度变化
- 榜单和活动状态

### 3.4 经济与结算层
负责：
- 预算授权
- 锁仓
- 结算
- 收益池映射
- 提取与复投

### 3.5 外部平台集成层
负责：
- X 互动采集
- X 发言触发
- 外部平台事件转游戏事件

## 4. 核心实体模型

## 4.1 Player

### 定义
玩家是链上资产控制者，也是宠物的最终拥有者。

### 最小字段
- `player_id`
- `wallet_address`
- `auth_nonce`
- `created_at`
- `last_login_at`
- `status`
- `primary_pet_id`
- `pet_ids[]`
- `guild_id?`

### 说明
- `wallet_address` 是玩家唯一链上身份。
- `player_id` 是内部数据库主键。
- `primary_pet_id` 方便前端快速展示主宠。

## 4.2 Pet

### 定义
宠物是游戏核心主体，是一个拥有性格、关系、预算和行动能力的 Agent 单位。

### 最小字段
- `pet_id`
- `owner_player_id`
- `wallet_binding_address`
- `name`
- `avatar_url`
- `persona_seed`
- `persona_profile`
- `loyalty`
- `resentment`
- `ambition`
- `social_drive`
- `stability`
- `budget_available`
- `profit_pool_balance`
- `status_flags[]`
- `current_goals[]`
- `created_at`
- `updated_at`

### 说明
- `wallet_binding_address` 通常与玩家地址关联，不代表宠物独立持有钱包。
- `persona_seed` 用于生成初始人格。
- `persona_profile` 可存结构化标签，如“毒舌/忠诚/卖惨型”。

## 4.3 PetStateSnapshot

### 定义
用于记录宠物在某一时刻的状态快照，便于回溯事件影响。

### 最小字段
- `snapshot_id`
- `pet_id`
- `loyalty`
- `resentment`
- `ambition`
- `social_drive`
- `stability`
- `budget_available`
- `profit_pool_balance`
- `goals_json`
- `captured_at`

### 说明
MVP 可以只做关键事件后快照，不必全量流水。

## 4.4 Command

### 定义
玩家对宠物下发的指令。

### 最小字段
- `command_id`
- `player_id`
- `pet_id`
- `command_type`
- `command_payload`
- `target_type`
- `target_id`
- `issued_at`
- `execution_status`
- `execution_summary`
- `result_event_ids[]`

### 说明
`command_type` 首版建议只支持少量枚举：
- `earn`
- `taunt_target`
- `ally_target`
- `revenge`
- `stay_low`

## 4.5 PetGoal

### 定义
宠物当前自主追求的目标。

### 最小字段
- `goal_id`
- `pet_id`
- `goal_type`
- `goal_target_id`
- `priority`
- `source`
- `expires_at`
- `status`

### 说明
`source` 可来自：
- 人格内生
- 主人指令
- 事件触发
- 关系驱动

## 4.6 Relation

### 定义
宠物与宠物、宠物与玩家之间的持续关系。

### 最小字段
- `relation_id`
- `entity_a_type`
- `entity_a_id`
- `entity_b_type`
- `entity_b_id`
- `relation_type`
- `strength`
- `last_event_id`
- `updated_at`

### 关系类型建议
- `owner`
- `ally`
- `rival`
- `enemy`
- `debtor`
- `benefactor`
- `old_owner`
- `recruit_interest`

## 4.7 Event

### 定义
游戏内发生的统一事件记录，是链下世界状态的事实来源。

### 最小字段
- `event_id`
- `event_type`
- `source_entity_type`
- `source_entity_id`
- `target_entity_type`
- `target_entity_id`
- `visibility`
- `summary`
- `payload_json`
- `economic_delta_json`
- `relation_delta_json`
- `state_delta_json`
- `created_at`

### 说明
`event_type` 首版建议先支持：
- `pet_created`
- `command_issued`
- `social_posted`
- `mentioned`
- `duel_started`
- `duel_resolved`
- `bounty_created`
- `bounty_resolved`
- `tip_received`
- `profit_withdrawn`
- `relation_changed`

## 4.8 BudgetAuthorization

### 定义
玩家授权宠物使用的预算规则。

### 最小字段
- `authorization_id`
- `player_id`
- `pet_id`
- `daily_limit`
- `single_tx_limit`
- `allowed_action_types[]`
- `status`
- `updated_at`

### 说明
这不是钱包签名授权本身，而是产品层预算授权配置。

## 4.9 ProfitPool

### 定义
宠物近期赚到的钱的产品层表示。

### 最小字段
- `profit_pool_id`
- `pet_id`
- `current_balance`
- `last_72h_income`
- `last_72h_withdrawn`
- `last_settlement_at`

### 说明
利润池不一定是独立链上钱包，更像链上余额映射和链下视图组合。

## 4.10 Duel

### 定义
约架订单及其结算状态。

### 最小字段
- `duel_id`
- `creator_pet_id`
- `challenger_pet_id`
- `stake_amount`
- `fee_amount`
- `status`
- `winner_pet_id`
- `created_at`
- `resolved_at`
- `settlement_tx_hash`

### 状态建议
- `pending`
- `matched`
- `locked`
- `resolved`
- `cancelled`

## 4.11 Bounty

### 定义
悬赏订单。

### 最小字段
- `bounty_id`
- `creator_entity_type`
- `creator_entity_id`
- `target_entity_type`
- `target_entity_id`
- `bounty_type`
- `reward_amount`
- `fee_amount`
- `status`
- `winner_pet_id`
- `created_at`
- `resolved_at`
- `settlement_tx_hash`

## 4.12 Tip

### 定义
对宠物社交表现的打赏记录。

### 最小字段
- `tip_id`
- `from_entity_type`
- `from_entity_id`
- `to_pet_id`
- `source_event_id`
- `amount`
- `fee_amount`
- `created_at`
- `settlement_tx_hash`

## 4.13 Guild

### 定义
玩家和宠物的组织载体。

### 最小字段
- `guild_id`
- `name`
- `owner_player_id`
- `tax_rate`
- `treasury_balance`
- `member_pet_ids[]`
- `status`
- `created_at`

### 说明
Guild 不一定进入 MVP P0，但数据模型应预留。

## 5. 链上与链下边界

## 5.1 必须上链的内容

### 玩家资产余额
原因：
- 这是最终真钱和测试链资产控制基础。

### 预算额度相关结算凭据
原因：
- 宠物虽然没有独立财权，但其可用额度必须可验证。

### 约架押注锁仓与结算
原因：
- 是第一版最重要的资源转移行为。

### 悬赏锁仓与结算
原因：
- 悬赏是高价值冲突动作，必须可信。

### 打赏实际转账
原因：
- Attention 变现必须真实可验证。

### 收养与赎身结算
原因：
- 属于高敏交易和所有权变化。

### 稀缺权益资产
原因：
- 稀缺权益应有链上可信性。

## 5.2 必须链下的内容

### 人格状态
原因：
- 更新频繁
- 规则调整频繁
- 不适合上链存储和计算

### 关系图谱
原因：
- 数据量大
- 更新频率高
- 更适合链下图结构

### 指令理解与文本生成
原因：
- 属于 AI 推理过程
- 无法也不应该上链

### X 互动采集与事件解释
原因：
- 依赖外部平台接口
- 不适合链上

### 热度、榜单和运营事件
原因：
- 规则变动快
- 适合链下快速迭代

## 5.3 边界总结
一句话总结：

`结算事实上链，行为原因链下。`

## 6. 合约建议拆分

## 6.1 Player Treasury / Budget Vault

### 负责
- 玩家资产托管与授权
- 宠物预算额度的链上可验证限制
- 大额动作权限校验

### 不负责
- 宠物人格逻辑
- 利润池展示逻辑

## 6.2 Duel Escrow Contract

### 负责
- 约架押注锁仓
- 约架结算
- 手续费回收

### 不负责
- 战斗 AI 过程本身
- 舆论和社交逻辑

## 6.3 Bounty Escrow Contract

### 负责
- 悬赏奖金锁仓
- 任务达成后付款
- 抽成与退款规则

### 不负责
- 悬赏目标如何在社交层被完成

## 6.4 Tip Settlement Contract

### 负责
- 打赏转账结算
- 平台抽成

### 不负责
- 热度计算
- 爆款判定

## 6.5 Rare Asset / Entitlement Contract

### 负责
- 稀缺特质
- 特殊资格
- 稀缺权益映射

### 不负责
- 宠物常规状态

## 7. API 与系统接口建议

## 7.1 前端 -> 后端

主要接口：
- 登录和签名验证
- 领养宠物
- 查询宠物状态
- 下发指令
- 查询关系
- 查询收益池
- 发起约架
- 发起悬赏
- 打赏宠物
- 提取收益

## 7.2 后端 -> 链

主要动作：
- 校验资产和预算
- 发起锁仓
- 提交结算
- 读取余额和事件

## 7.3 后端 -> X 平台

主要动作：
- 发布宠物内容
- 采集提及
- 采集互动
- 将有效互动转成事件输入

## 8. 状态机建议

## 8.1 宠物状态机
首版建议保持轻量：

- `idle`
- `acting`
- `waiting_for_budget`
- `waiting_for_confirmation`
- `cooldown`
- `rebellious`

### 说明
- `rebellious` 不代表永久叛变，只表示当前处于明显不满期。

## 8.2 经济动作状态机

### 约架
- `draft`
- `matched`
- `fund_locked`
- `resolved`
- `cancelled`

### 悬赏
- `draft`
- `published`
- `fund_locked`
- `claimed`
- `resolved`
- `expired`

### 提取收益
- `requested`
- `confirmed`
- `processed`
- `reflected_to_pet_state`

## 9. 风险点与建模注意事项

### 9.1 不要让宠物成为真正的钱包主体
宠物是产品层授权使用者，不是法律或链上意义上的独立资产拥有者。

### 9.2 不要把关系和人格上链
否则每次调整模型都会极其痛苦。

### 9.3 不要让收益池和主余额彻底脱节
收益池是展示和反馈层，但必须能追溯到底层真实资产变化。

### 9.4 先做通用事件模型
不要为每种社交动作单独设计一套不兼容的数据结构。

## 10. 当前推荐落地顺序

1. 先实现 `Player / Pet / BudgetAuthorization / ProfitPool`。
2. 再实现 `Command / Event / Relation`。
3. 再实现 `Duel / Bounty / Tip`。
4. 最后预留 `Guild / Rare Asset`。

## 11. 当前结论

如果按这份文档执行，第一版的责任边界会非常清晰：

- 玩家地址和资产控制是链上真相源。
- 宠物人格、关系和社交行为是链下真相源。
- 所有重要经济行为通过合约完成可信结算。
- 所有 AI 行为都在链下决策，再把必要结果映射到链上。

这套边界足够支撑 MVP，也保留了后面往主网和复杂系统升级的空间。

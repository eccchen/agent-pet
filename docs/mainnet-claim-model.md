# 主网领取模型

这个仓库把领取视为一种由用户主动发起的正式流程。

在验证阶段，玩法可以先保持测试优先，但用户体验约定要按主网式处理：

- 用户在 OpenClaw 里主动发起领取
- 用户钱包自己支付 gas
- 后端负责准备领取状态并验证 `txHash`
- 网站只展示领取结果，不承担领取操作

## 接口面

OpenClaw 客户端和技能包暴露一组领取相关能力，可以在不破坏当前调用点的情况下接未来后端接口：

- `getClaimSnapshot()`
- `prepareClaimOnchain()`
- `confirmClaimOnchain(txHash)`
- `cancelClaimOnchain()`

`home` 和 `economy` 快照也可能暴露：

- `claimableBalance`
- `claim`

## 预期流程

1. 后端暴露领取快照。
2. 用户在 OpenClaw 中查看可领取余额。
3. 客户端向后端请求领取意图。
4. 后端为 `CannedClaimVault` 准备链下领取授权。
5. 用户钱包广播 `claim(...)` 交易并支付 gas。
6. 客户端把结果 `txHash` 确认回后端。
7. 如果领取过期，客户端可以取消这笔进行中的领取状态。

## 重要不变量

- 领取必须由用户主动发起。
- 交易必须由用户钱包签名或广播。
- gas 必须由用户自己支付。
- 后端负责准备和记录领取状态，但不假设托管关系。
- 领取授权在链下完成，并通过 `claimId` 做防重放。
- 已领取的 `罐头` 通过 `CannedToken` 到达用户钱包。
- 现有 `home`、`economy`、`command` 和链上同步调用保持兼容。

## 合约

领取流程依赖：

- `CannedToken`
  用于承载游戏资产的受限转账代币。
- `CannedClaimVault`
  验证链下授权领取签名，并把 `罐头` 铸造到领取钱包。

## 后端要求

当 `CHAIN_SYNC_MODE=xlayer` 时，领取意图需要：

- `CLAIM_VAULT_ADDRESS`
- `CLAIM_SIGNER_PRIVATE_KEY`
- `XLAYER_CHAIN_ID`

这些地址和配置可以来自显式环境变量，也可以来自部署清单。

## CLI 面

OpenClaw 客户端 CLI 现在包含领取相关命令：

- `claim-snapshot`
- `claim-prepare`
- `claim-confirm`
- `claim-cancel`

这些命令已经为后端领取接口预留好位置。

## 上线说明

第一轮内部上线时，领取路径在 OpenClaw 内验证，网站只做只读展示。网站可以展示领取状态，但不应该变成确认领取或广播交易的主操作面。
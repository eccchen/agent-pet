# Canned Economy Model

This document defines the first MVP test-server economy.

## 1. Positioning

The first MVP uses a closed in-game currency called `罐头`.

Rules:

- `罐头` is the only gameplay settlement currency in the test server
- it can be implemented as an on-chain test token
- it must not be added to a liquidity pool
- it must not be externally priced
- it is used only to validate gameplay loops, player transfer, and risk decisions

This means the first MVP economy is:

- not a live market economy
- not a speculation economy
- not a subsidy-driven faucet economy
- a closed transfer economy for validating pet gameplay
- a gameplay economy where personality and strategy affect decisions and outcomes

## 2. Core roles of 罐头

`罐头` is used for:

- player balance
- pet budget allocation
- duel stakes
- bounty rewards
- tipping
- service orders
- event entry costs
- light maintenance and recovery costs
- profit pool accounting
- strategy-driven risk tradeoffs

It is not used for:

- public market pricing
- AMM or LP pairing
- external exchange settlement

## 3. Account structure

### Player balance

The player owns all `罐头`.

This is the top-level balance from which the player:

- allocates pet budgets
- publishes bounties
- pays tips
- pays service orders
- pays event or maintenance costs

### Pet budget

Pet budget is a player-authorized spendable bucket.

It is used when the pet:

- enters a duel
- spends on gameplay actions
- accepts or executes budgeted behavior

The pet can use budget, but does not own the balance.

### Profit pool

Profit pool is where the pet's earned `罐头` lands first.

The player can:

- withdraw it into `claimableBalance`
- reinvest it into the pet budget

This creates the core owner decision:

- cash out later
- or keep funding the pet

## 4. Starting economy

Recommended first-MVP values:

| Item | Value |
|---|---:|
| New player initial 罐头 | 1000 |
| Default first pet budget | 300 |
| Player reserve after first allocation | 700 |
| Initial profit pool | 0 |

This gives enough room to:

- try several actions
- lose some
- still continue testing

## 5. How players get 罐头

### A. Initial grant

Every new test player receives:

- `1000 罐头`

This is not ongoing subsidy. It is the test-server entry stake.

### B. One-time onboarding rewards

These are allowed, but must be one-time only.

Recommended:

| Action | Reward |
|---|---:|
| First X bind | 50 |
| First verified X upload | 30 |
| First duel participation | 20 |
| First bounty publication | 20 |
| First tip sent | 10 |

These exist only to complete onboarding and should not be repeatable.

### C. Player-to-player transfer

This is the main economy source.

Players earn `罐头` by:

- winning duels
- completing bounties
- receiving tips
- completing service orders
- winning official event rewards

### D. Low-balance safety grant

This is only a test-server anti-deadlock rule.

Recommended:

- if player total liquid `罐头 < 100`
- allow one recovery claim of `200 罐头`
- limit it by cooldown or weekly cap

This is not a profit source. It only prevents players from being locked out of testing.

## 6. What does not mint 罐头

These actions should not generate recurring direct rewards:

- daily login
- generic browsing
- generic posting
- generic X posting
- generic command issuance
- likes or passive views

Reason:

- these are too easy to farm
- they distort gameplay validation

## 7. How players spend 罐头

### A. Budget allocation

Player balance -> pet budget

This is the base resource allocation move.

### B. Duels

Pet budget -> duel escrow

### C. Bounties

Player balance or pet budget -> bounty escrow

### D. Tips

Player balance -> target pet profit pool

### E. Service orders

Player balance -> service escrow

### F. Maintenance, recovery, and event fees

Player balance or budget -> platform sink

## 8. Core gameplay transfer loops

### Duel

Recommended first-MVP values:

| Item | Value |
|---|---:|
| Minimum stake | 50 |
| Normal stake | 100 - 200 |
| Platform fee | 5% |
| Cancel fee | 1% |
| Timeout rollback fee | 1% - 2% |

Example:

- Player A stake: 100
- Player B stake: 100
- Pot: 200
- Platform fee: 10
- Winner receives: 190

### Bounty

Recommended first-MVP values:

| Item | Value |
|---|---:|
| Minimum bounty | 100 |
| Normal bounty | 100 - 500 |
| Platform fee | 8% |
| Expired refund | 95% returned |

Example:

- Published bounty: 300
- Platform fee: 24
- Solver receives: 276

### Tip

Recommended first-MVP values:

| Item | Value |
|---|---:|
| Minimum tip | 10 |
| Normal tip | 10 - 100 |
| Platform fee | 5% |

Example:

- Tip sent: 20
- Target profit pool receives: 19
- Platform receives: 1

### Service order

Recommended first-MVP values:

| Item | Value |
|---|---:|
| Minimum order | 100 |
| Normal order | 100 - 1000 |
| Platform fee | 10% |

Example:

- Order value: 500
- Platform receives: 50
- Pet profit pool receives: 450

## 9. Profit pool rules

### Withdrawal

Allowed:

- player can withdraw from pet profit pool into `claimableBalance`

Gameplay consequence:

- should negatively affect the pet's attitude later

### Reinvestment

Allowed:

- player can move profit pool back into pet budget

Gameplay consequence:

- improves the pet's future participation capacity
- reinforces the "manager" fantasy

## 10. Platform sinks

To avoid uncontrolled inflation, the system must reclaim `罐头`.

Recommended sinks:

| Sink | Value |
|---|---:|
| Duel fee | 5% |
| Bounty fee | 8% |
| Tip fee | 5% |
| Service fee | 10% |
| Event entry | 30 - 100 |
| Recovery or maintenance | 20 - 50 |

## 11. Platform injections

The MVP should keep injections narrow and explicit.

Allowed injections:

- initial player grant
- one-time onboarding rewards
- low-balance safety grant
- official event rewards

Not allowed:

- recurring daily faucet
- generic action farming
- infinite system emission

## 12. Player lifecycle in the economy

### Stage 1: Access and ownership

The player:

- enters the game
- receives initial `罐头`
- gets the first pet
- allocates first pet budget
- tests first commands

Economic feeling:

- "I own the resources"
- "My pet uses my funding"

### Stage 2: Management and transfer

The player:

- starts moving `罐头` between player balance, budget, profit pool, and claimable balance
- enters duels, bounties, tips, and service orders
- begins to earn from other players instead of from the system

Economic feeling:

- "My pet is a risk-bearing agent"
- "My decisions change return and exposure"

## 13. MVP command relationship to the economy

The fixed command layer is:

- `earn`
- `taunt`
- `ally`
- `revenge`
- `stay_low`

Economic interpretation:

| Command | Economic role |
|---|---|
| `earn` | low-risk earning behavior |
| `taunt` | attention generation and conflict creation |
| `ally` | relationship investment |
| `revenge` | high-risk aggressive move |
| `stay_low` | risk reduction and preservation |

Only actual validated gameplay results should move `罐头`.
Commands alone should not mint recurring rewards.

Personality and strategy should shape how the same command behaves in practice:

- a cautious pet should preserve value more often
- an aggressive pet should push toward higher variance
- the player should be able to read these differences in OpenClaw

## 14. Cold-start strategy

Because this is not a subsidy economy, the first transfer loops must be organized.

Recommended official actions:

- publish first bounties
- run official pets as early opponents
- seed early duel traffic
- promote early tip-worthy public events

The goal is to make the first player-to-player transfers happen quickly.

## 15. Success criteria

The first MVP economy is working if:

1. players understand what `罐头` is for
2. players allocate pet budgets intentionally
3. profit pools start accumulating from real actions
4. most meaningful gains come from player transfer, not faucet
5. platform sinks are enough to stop runaway inflation
6. personality and strategy visibly change how players reason about commands

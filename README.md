# OGame Orion Upgrade Planner

Find the cheapest next account-wide upgrade per **+1% resource reward**. Every step upgrades one level on all selected planets and recomputes all candidates.

Website: https://zikunow.github.io/ogame-orion-upgrade-planner/

The starting configuration is 100%. The planner compares scanner upgrades, metal/crystal/deuterium buildings and General T18. It shows step and cumulative cost, step gain, compounded total gain relative to the start, MSU per +1% and scanner-level snapshots. There are no absolute flight-income estimates or lithium settings, candidates or balances.

## Model

- Each resource contributes one third of base resource MSU.
- Each resource building adds `0.002 × planets × level` to that resource's bonus.
- Resource factor: `1 + (metalBonus + crystalBonus + deuteriumBonus) / 3`.
- Scanner resource rewards are assumed proportional to `floor(168.96 × level × 1.1^(level−1))`. Only scanner ratios are used.
- T18 enhancement: `0.002 × T18 × planets × (1 + 0.001 × experience + buildingBoost)`.
- General multiplier: `2 + enhancement` in PvP, `1.5 + 0.5 × enhancement` in PvE. Choose a mode; PvP is the default. Other classes use multiplier 1 and exclude T18.
- Total resource index: scanner factor × resource factor × class multiplier.
- Step gain: `(indexAfter / indexBefore − 1) × 100`.
- Total gain: `(indexAfter / indexStart − 1) × 100`.
- Efficiency: step cost in MSU / step gain in percent. Lower is better.

For 18 planets, a single metal building upgrade adds 3.6 percentage points to the metal bonus, or 1.2 points to the combined resource bonus. With all three buildings initially at level 15, the actual total resource reward gain is `1.552 / 1.54 − 1 = 0.77922%`; from all level 0 it is exactly 1.2%.

The algorithm makes a greedy next-step choice, not a proven global optimum. Percent gains compound; they do not add. Equal efficiencies use lower cost and then the stable order scanner, metal, crystal, deuterium, T18. A path stops when the best next upgrade exceeds the remaining optional budget.

Costs use exact rational BigInt arithmetic copied from the IAS/building/T18 calculators; reward factors and percentages are approximate. MSU = Metal + 1.5 × Crystal + 3 × Deuterium. Built levels and lifeform discount/boost building construction are excluded. Calculator ranges: 50 planets, scanner/T18 up to 80, resource buildings up to 50 (not confirmed game caps).

## Validation and deployment

```sh
node --test tests/*.test.cjs
python3 tests/planner-reference.py > tests/fixtures/planner-reference.json
```

The first ten steps in PvP and PvE match an independent 65-digit Python Decimal reference. Tests also cover resource shares, all-planet costs, discounts, compound gains, budgets, caps, class exclusions and the UI adapter. The GitHub Pages workflow runs these tests, publishes the static site and checks the live interface in RU/EN, both themes and four viewport widths.

Enable **Settings → Pages → Source → GitHub Actions**. Future pushes to `main` deploy automatically.

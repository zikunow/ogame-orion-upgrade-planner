# OGame Orion Upgrade Planner

An experimental upgrade planner for OGame Project Orion. Enter your account configuration to generate a sequence of IAS, resource building, lithium building and General T18 upgrades, with costs and expected reward gains.

**Every step upgrades one level on all selected planets.** Default: 18 planets. The planner recomputes all candidates after every step and selects the highest positive expected gain per invested MSU. This is a greedy path, not a guaranteed global optimum.

## Website

https://zikunow.github.io/ogame-orion-upgrade-planner/

RU/EN, minimal/cosmic themes, 10/50/100 steps, optional budget and shareable settings links. Scanner snapshots are recorded before the next chosen scanner upgrade; the final snapshot shows the stopping state.

## Enable GitHub Pages

1. Open **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open **Actions → Deploy GitHub Pages → Run workflow** if the first run failed before Pages was enabled.

The workflow tests calculations, publishes the static page and verifies the live interface at 1440, 768, 390 and 320 px.

## Calculation model

Uses the fixed second-algorithm experimental selection: 102 flights (12 PvE, 90 PvP) and 313 scans. Mean reward bases and exact cost functions are reused from [Orion Rewards Calculator](https://github.com/zikunow/ogame-orion-rewards-calculator).

`V = expected resource MSU + assumed lithium value × (lithium reward − claim cost − search cost)`

Candidates are ranked by `deltaV / upgradeCostMSU`. Costs include all selected planets and use exact BigInt arithmetic. Expected rewards and efficiencies use floating-point numbers. Lithium value is an assumed valuation, not a game exchange rate. Each resource accounts for one third of base resource MSU as an explicit assumption.

Economy is fixed at the verified ×10 baseline in this version. Lithium reward scaling with Q is an explicit switch, disabled by default. The mission selection is held fixed; thresholds are not reapplied after upgrades. Q is a scaling parameter, not additional free daily lithium income.

At default settings the first upgrades are T18 7→8, lithium 18→19, crystal 15→16, deuterium 15→16, metal 15→16. No scanner upgrade is selected in the first 50 steps under the conservative lithium assumption. With proportional lithium scaling enabled, scanner 39→40 is step 3.

Calculator limits (not confirmed game caps): 50 planets, scanner/T18 level 80 and resource/lithium building level 50. If the best upgrade exceeds the remaining budget, the planner stops without choosing a cheaper substitute. Lifeform discount and technology boost building construction is excluded.

## Validation

```sh
node --test tests/*.test.cjs
```

The first ten steps in both lithium modes are independently checked against a Python Decimal reference with 65-digit precision. Regenerate its fixture with:

```sh
python3 tests/planner-reference.py > tests/fixtures/planner-reference.json
```

Related calculators: [IAS / buildings / T18](https://zikunow.github.io/ogame-orion-ias-calculator/), [expected rewards](https://zikunow.github.io/ogame-orion-rewards-calculator/).

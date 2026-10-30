# OGame Orion Upgrade Planner

Website: https://zikunow.github.io/ogame-orion-upgrade-planner/

Plan account-wide upgrades by the gain in **sustainable resource MSU per calendar day**, including lithium production, paid scans, claim costs and expected cashback. Every step adds one level on every selected planet. Existing levels and lifeform support-building construction are excluded from investment cost.

The path compares scanner levels, separate metal/crystal/deuterium buildings, the lithium building and General T18. It shows incremental cost, daily income gain, MSU per +1%, marginal payback days and scanner-level snapshots. A session forecast shows flight hours, missions and scans, resources per session, refill waiting days and the full start-to-start cycle. RU/EN, both themes and shareable URL parameters remain supported.

## Strategy and data

- Default strategy: PvP, actual resource reward / gross claim lithium >= **28.4**, six concurrent slots, war fleet speed x2, a reserve of **20% of weekly lithium capacity**.
- Reference sample: 333 six-result scans, 1,998 anonymous anomalies, IAS 711, 30 October 2026, economy x10. `anomaly-sample.js` contains only mode, metal, crystal, deuterium, claim price and duration. No player IDs, coordinates or session identifiers are published.
- Sample resource rewards are normalized by the observed +61.2% building bonus and assumed reference General multipliers 1.5 for PvE / 2 for PvP, matching the source analysis. Selected building and T18 multipliers are then applied. Reference T18 enhancement was not independently recorded; a different reference multiplier would change extrapolated income.
- Rewards and claim costs scale in proportion to hourly lithium production relative to the reference 4,724,761. This is an empirical extrapolation, not a verified formula across every IAS/economy/class. Duration scales inversely from reference fleet speed x2. Extra return flight and manual action time are excluded.
- Selection is recomputed from every source result after every candidate upgrade. Metal, crystal and deuterium shares come from the sample; they are not assumed equal thirds.
- The threshold stays at the user's configured value. It is not automatically reoptimized as bonuses change; 28.4 is a measured starting strategy, not a universal optimum.

## Lithium economics

Working assumption (not yet confirmed as the exact game formula):

```
buildingBonus = 0.002 * planets * lithiumLevel
expectedCashback = baseCashback / 100 * (1 + buildingBonus)
```

Base cashback defaults to 5%. At 18 planets and lithium building 17 it is 8.06%. This is a relative bonus, not 61.2 percentage points added to the cashback. No class/T18 cashback multiplier is assumed. The unknown cashback distribution is replaced by its expected value; random refund risk is not modelled.

```
scanPrice = hourlyProduction / 2
scansPerFlight = sourceScanCount / eligibleMissionCount
netLithiumPerFlight = meanClaim * (1 - expectedCashback)
                   + scanPrice * scansPerFlight
flightsPerDay = min(24 * hourlyProduction / netLithiumPerFlight,
                   slots * 1440 / meanDurationMinutes)
dailyIncome = flightsPerDay * meanResourceMSU
weeklyCapacity = 168 * hourlyProduction
reserve = weeklyCapacity * reservePercent / 100
```

Scans receive no cashback. Positive source resource rewards are counted, including resource parts of mixed rewards; ships, items, artefacts and XP are not assigned MSU. All selected missions are assumed completed successfully. Fuel, battle losses, PvP risk and the resource/food cost of lithium conversion are excluded. Results are **gross resource rewards**, not net profit. Partial completion by internal wave is not optimized.

For session timing the browser runs 256 deterministic, repeatable Monte Carlo sessions, resampling entire scan batches. It processes several eligible results from a scan, schedules at most the chosen number of concurrent missions, reserves the full claim price, pays at completion and then credits mean cashback. Production continues and is capped against the real balance, including reserved funds. Further launches/scans stop when projected cash after existing commitments reaches the reserve; existing missions finish, and the next cycle starts as soon as stock refills. Duration and terminal reserve are approximate. If mean slot capacity is insufficient to consume ongoing production, a finite session is explicitly not forecast.

Ranking uses the fast stationary daily-income formula above; the Monte Carlo calendar rate may differ slightly because of finite batches, the final mission and lost production at the cap. No-target states are explicit and do not emit infinities. A greedy step can increase eligibility across the cutoff or leave it unchanged. It chooses the highest positive additional daily income per upgrade MSU, not a proven global investment optimum. If the best next step exceeds the remaining budget, the path stops, preserving the existing budget-prefix behavior.

Costs use exact rational BigInt arithmetic copied from the IAS/building/T18 calculators. Lithium building bases are 52,500 metal / 37,500 crystal / 37,500 deuterium, with factor 1.5. MSU = metal + 1.5 crystal + 3 deuterium. Calculated income and timing use floating-point arithmetic. Ranges are calculator bounds, not verified game caps.

## Validation

```sh
python3 tests/planner-reference.py > tests/fixtures/planner-reference.json
node --test tests/*.test.cjs
# Optional browser QA against a local or deployed server:
PLANNER_URL=http://127.0.0.1:8080/?lang=en node tests/planner-browser-check.cjs
```

The independent Python Decimal reference aggregates the sample and checks normalizations, eligible counts, production and sustainable income. Tests also cover cashback-only lithium gains, unrefunded scans, fresh selection, slot limits, exact all-planet costs, budgets, compounded gains, deterministic session timing, conservation of lithium, refill periods, validation and the UI adapter. Browser QA covers four viewport widths, RU/EN and both themes.

The Pages workflow deploys `anomaly-sample.js` with the calculator assets. Changes to `main` run unit tests and publish; the existing post-publication browser check then verifies the live page.

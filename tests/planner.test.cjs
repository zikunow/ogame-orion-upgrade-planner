const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../planner-core.js'),O=require('../planner-costs.js'),data=require('../anomaly-sample.js'),fixture=require('./fixtures/planner-reference.json');
const s=(patch={})=>({...P.defaults,...patch});
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<Math.max(1e-8,Math.abs(b)*tol),`${a} != ${b}`);
for(const [name,patch]of [['reference',{metal:17,crystal:17,deut:17,t18:0}],['default',{}],['withoutLithium',{metal:17,crystal:17,deut:17,t18:0,lithium:0}]])test(name+': income agrees with independent Decimal calculation',()=>{
 const value=P.value(s(patch)),expected=fixture[name];
 for(const [key,v]of Object.entries(expected))close(value[key],Number(v));
});
test('reference batch retains 333 scans, 162 eligible targets and observed rewards',()=>{
 assert.equal(data.scans.length,333);assert.ok(data.scans.every(x=>x.length===6));
 assert.deepEqual(data.fields,['pvp','metal','crystal','deut','claimLithium','minutes']);
 assert.ok(data.scans.flat().every(row=>row.length===6&&[0,1].includes(row[0])&&row.every(Number.isFinite)));
 const v=P.value(s({metal:17,crystal:17,deut:17,t18:0}));
 assert.equal(v.selected,162);close(v.meanReward/v.scale,725361756.2901235);close(v.meanClaimCost/v.scale,20269274.777777776);
 close(v.cashback,.0806);close(v.scanPrice,v.production/2);
 close(v.netPerFlight,v.meanClaimCost*.9194+v.scanPrice*v.scansPerFlight);
});
test('lithium upgrade affects only cashback; scans receive no refund',()=>{
 const state=s({metal:17,crystal:17,deut:17,t18:0}),before=P.value(state),after=P.value({...state,lithium:18});
 close(after.cashback-before.cashback,.0018);close(after.production,before.production);close(after.meanReward,before.meanReward);assert.equal(after.selected,before.selected);
 close(before.netPerFlight-after.netPerFlight,before.meanClaimCost*.0018);
 close((after.dailyIncome/before.dailyIncome-1)*100,.15555127524846668);
 const noCash=s({baseCashback:0});close(P.value(noCash).dailyIncome,P.value({...noCash,lithium:0}).dailyIncome);
 assert.equal(P.candidates(noCash).find(x=>x.type==='lithium').dailyGain,0);
});
test('production scales rewards and costs once; bonuses cause a fresh selection',()=>{
 const before=P.value(s()),scanner=P.value(s({scannerLevel:40}));
 assert.equal(scanner.selected,before.selected);close(scanner.dailyIncome/before.dailyIncome,scanner.production/before.production);
 const metal=P.value(s({metal:16}));assert.notEqual(metal.selected,before.selected);
 const small=P.value(s({economy:1}));close(small.dailyIncome/before.dailyIncome,small.production/before.production);
});
test('candidate costs, gain and payback cover all planets including lithium',()=>{
 assert.ok(P.types.includes('lithium'));
 for(const type of P.types){assert.equal(P.cost(s(),type).units,2n*P.cost(s({planets:9}),type).units);const a=P.cost(s({labLevel:0}),type),b=P.cost(s({labLevel:100}),type);if(type==='t18')assert.ok(b.units<a.units);else assert.equal(a.units,b.units);}
 assert.equal(P.cost(s(),'lithium').resources.metal,O.resourceCostAtLevel(18,'lithium').metal*18n);
 const best=P.candidates(s())[0];close(best.paybackDays,best.msu/best.dailyGain);close(best.msuPerPercent,best.msu/best.gainPercent);
});
test('path recomputes gains; budgets and snapshots reconcile',()=>{
 const initial=s({steps:100}),r=P.generate(initial);let state=initial,total=0n,multiplier=1;
 for(const row of r.rows){assert.equal(row.type,P.candidates(state).find(x=>x.dailyGain>0).type);assert.ok(row.dailyGain>0);total+=row.units;assert.equal(total,row.totalUnits);multiplier*=1+row.gainPercent/100;close((multiplier-1)*100,row.totalGainPercent);state=row.state;}
 assert.equal(total,r.totalUnits);assert.equal(r.slices.reduce((sum,x)=>sum+x.transitionUnits,0n),total);
 const best=P.candidates(s())[0];assert.equal(P.generate(s({budget:'0'})).rows.length,0);assert.equal(P.generate(s({budget:String(best.msu)})).rows.length,1);
 for(const x of r.slices.filter(x=>x.complete))assert.equal(r.rows[x.step].type,'scannerLevel');
});
test('session conserves lithium, accounts for refill, and is reproducible',()=>{
 const state=s({metal:17,crystal:17,deut:17,t18:0}),v=P.value(state),a=P.session(state,256),b=P.session(state,256);
 assert.deepEqual(a,b);assert.equal(a.status,'ok');assert.ok(a.activeHours>0&&a.waitDays>0&&a.flights>0&&a.scans>0);
 close(a.cycleDays,a.activeHours/24+a.waitDays);close(a.cycleDays*24*v.production,a.netSpent+a.capWaste);
 close(a.endLithium,v.weeklyCap+a.activeHours*v.production-a.netSpent-a.capWaste);
 close(a.dailyIncome,a.resource/a.cycleDays);assert.ok(Math.abs(a.dailyIncome/v.dailyIncome-1)<.03);
 const reserve=P.session({...state,reservePercent:30},256);assert.ok(reserve.waitDays<a.waitDays);assert.ok(reserve.resource<a.resource);
 assert.equal(P.session({...state,slots:1,fleetSpeed:.1},4).status,'continuous');
});
test('no targets, zero baseline, caps, classes and invalid inputs are explicit',()=>{
 const missing=s({threshold:1000});assert.equal(P.value(missing).dailyIncome,0);assert.equal(P.generate(missing).reason,'noTargets');assert.equal(P.session(missing,1).status,'noTargets');
 for(const playerClass of ['collector','discoverer'])assert.ok(P.generate(s({playerClass,threshold:0,steps:10})).rows.every(x=>x.type!=='t18'));
 assert.equal(P.generate(s({scannerLevel:80,metal:50,crystal:50,deut:50,lithium:50,t18:80})).reason,'noGain');
 for(const patch of [{planets:0},{lithium:NaN},{baseCashback:Infinity},{reservePercent:100},{threshold:-1},{slots:0},{fleetSpeed:0},{mission:'wrong'},{budget:'1e1000'}])assert.throws(()=>P.generate(s(patch)),RangeError);
 assert.equal(P.budgetUnits('9007199254740993.5'),18014398509481987n);assert.throws(()=>P.budgetUnits('1.2'));
});
test('UI exposes new strategy, forecasts and lithium; no stale results after edits',()=>{
 const elements={};const el=id=>elements[id]??=({value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,handlers:{},addEventListener(k,fn){this.handlers[k]=fn},setAttribute(){}});
 const context=vm.createContext({OrionPlanner:P,OrionCosts:O,URL,URLSearchParams,Intl,Number,BigInt,Math,document:{getElementById:el,documentElement:{dataset:{}}},location:{href:'https://example.com/',search:'?lithium=17&threshold=28.4'},history:{replaceState(){}},navigator:{clipboard:{async writeText(){}}}});
 vm.runInContext(fs.readFileSync(require.resolve('../planner.js'),'utf8'),context);
 assert.match(el('form').innerHTML,/id="lithium"/);assert.match(el('results').innerHTML,/Доход за календарный день/);assert.match(el('results').innerHTML,/Окупаемость/);assert.match(el('cashbackHelp').textContent,/8,06/);
 el('planets').value='0';el('planets').handlers.input();assert.equal(el('generate').disabled,true);assert.equal(el('results').innerHTML,'');
 el('reset').handlers.click();assert.equal(el('generate').disabled,false);el('langEn').handlers.click();assert.match(el('results').innerHTML,/Calendar-day income/);
 el('budget').value='0';el('budget').handlers.input();el('generate').handlers.click();assert.match(el('results').innerHTML,/No upgrades selected/);
});

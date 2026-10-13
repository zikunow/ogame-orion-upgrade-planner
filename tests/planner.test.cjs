const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../planner-core.js'),O=require('../planner-costs.js'),fixture=require('./fixtures/planner-reference.json');
const s=(patch={})=>({...P.defaults,...patch});
const close=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1e-8,Math.abs(b)*1e-11),`${a} != ${b}`);
for(const mission of ['pvp','pve'])test(`${mission}: first ten steps agree with independent Decimal calculation`,()=>{
 const r=P.generate(s({mission,steps:10}));
 r.rows.forEach((a,i)=>{const b=fixture[mission][i];assert.equal(a.type,b.type);assert.equal(a.to,b.to);assert.equal(a.msu,Number(b.msu));close(a.gainPercent,Number(b.gainPercent));close(a.totalGainPercent,Number(b.totalGainPercent));close(a.msuPerPercent,a.msu/a.gainPercent);});
});
test('metal +1 gives 1.2% from zero, but 0.77922% from all level 15',()=>{
 for(const [levels,expected]of [[0,1.2],[15,1.2/1.54]]){
  const state=s({metal:levels,crystal:levels,deut:levels});const before=P.value(state),after=P.value({...state,metal:levels+1});
  close((after.index/before.index-1)*100,expected);close(after.resourceBonus-before.resourceBonus,.012);
 }
});
test('exact costs apply all planets; discount affects T18 only',()=>{
 for(const type of P.types){assert.equal(P.cost(s(),type).units,2n*P.cost(s({planets:9}),type).units);const a=P.cost(s({labLevel:0}),type),b=P.cost(s({labLevel:100}),type);if(type==='t18')assert.ok(b.units<a.units);else assert.equal(a.units,b.units);}
 assert.equal(P.cost(s(),'t18').resources.metal,O.generalCostAtLevel(8,25).metal*18n);
 assert.notEqual(P.value(s()).resourceFactor,P.value(s({planets:9})).resourceFactor);
});
test('all candidates recompute; totals compound and snapshots reconcile',()=>{
 const initial=s({steps:100}),r=P.generate(initial);let state=initial,total=0n,multiplier=1;
 for(const row of r.rows){const best=P.candidates(state)[0];assert.equal(row.type,best.type);assert.ok(row.gainPercent>0);total+=row.units;assert.equal(total,row.totalUnits);multiplier*=1+row.gainPercent/100;close((multiplier-1)*100,row.totalGainPercent);state=row.state;}
 assert.equal(total,r.totalUnits);assert.equal(r.slices.reduce((a,x)=>a+x.transitionUnits,0n),total);assert.ok(r.slices.length>1);
 for(const x of r.slices.filter(x=>x.complete)){assert.equal(r.rows[x.step].type,'scannerLevel');assert.equal(x.state.scannerLevel,r.rows[x.step].from);}
});
test('budgets, class exclusions, ranges and old links are handled',()=>{
 const best=P.candidates(s())[0];assert.equal(P.generate(s({budget:'0'})).rows.length,0);const r=P.generate(s({budget:String(best.msu)}));assert.equal(r.rows.length,1);assert.equal(r.reason,'budget');
 assert.equal(P.budgetUnits('9007199254740993.5'),18014398509481987n);assert.throws(()=>P.budgetUnits('1.2'));
 for(const playerClass of ['collector','discoverer'])assert.ok(P.generate(s({playerClass})).rows.every(x=>x.type!=='t18'));
 assert.equal(P.generate(s({scannerLevel:80,metal:50,crystal:50,deut:50,t18:80})).reason,'noGain');
 for(const patch of [{planets:0},{metal:NaN},{t18:Infinity},{mission:'wrong'},{experience:101},{budget:'1e1000'}])assert.throws(()=>P.generate(s(patch)),RangeError);
 assert.deepEqual(P.generate(s({lithium:100,lithiumValue:1e9,scaleLithium:true})).rows,P.generate(s()).rows.map(x=>({...x,state:{...x.state,lithium:100,lithiumValue:1e9,scaleLithium:true}})));
});
test('UI presents percentage gains and removes old inputs and result columns',()=>{
 const elements={};const el=id=>elements[id]??=({value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,handlers:{},addEventListener(k,fn){this.handlers[k]=fn},setAttribute(){}});
 const context=vm.createContext({OrionPlanner:P,OrionCosts:O,URL,URLSearchParams,Intl,Number,BigInt,Math,document:{getElementById:el,documentElement:{dataset:{}}},location:{href:'https://example.com/',search:'?lithium=18&lithiumValue=40&scaleLithium=1'},history:{replaceState(){}},navigator:{clipboard:{async writeText(){}}}});
 vm.runInContext(fs.readFileSync(require.resolve('../planner.js'),'utf8'),context);
 assert.match(el('results').innerHTML,/МСУ \/ \+1%/);assert.doesNotMatch(el('form').innerHTML+el('results').innerHTML,/lithium|scaleLithium|чистого Li|Δ V|вылет/);
 el('planets').value='0';el('planets').handlers.input();assert.equal(el('generate').disabled,true);el('reset').handlers.click();assert.equal(el('generate').disabled,false);
 el('langEn').handlers.click();assert.match(el('results').innerHTML,/Total gain vs start/);
 el('budget').value='0';el('budget').handlers.input();el('generate').handlers.click();assert.match(el('results').innerHTML,/No upgrades selected/);
});

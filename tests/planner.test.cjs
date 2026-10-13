const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const P=require('../planner-core.js'),O=require('../rewards-core.js');
const fixture=require('./fixtures/planner-reference.json');
const close=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1e-5,Math.abs(b)*1e-11),`${a} != ${b}`);
const s=(patch={})=>({...P.defaults,...patch});
test('baseline reward model matches existing rewards calculator including search',()=>{
 const a=P.value(s()),b=O.calculate({...O.defaults});
 assert.equal(a.q,4436514);assert.equal(a.ias,702);
 close(a.resource,b.rewards.resource);close(a.lithium,b.rewards.lithium);
 close(a.claim,b.claim);close(a.search,b.scan*b.scansPerFlight);
 close(a.v,a.resource+40*(a.lithium-a.claim-a.search));
});
for(const scaleLithium of [false,true])test(`first ten steps match independent Decimal reference; lithium scaling=${scaleLithium}`,()=>{
 const rows=P.generate(s({steps:10,scaleLithium})).rows,expected=fixture[scaleLithium?'scaled':'unscaled'];
 assert.equal(rows.length,10);
 rows.forEach((r,i)=>{assert.equal(r.type,expected[i].type);assert.equal(r.to,expected[i].to);assert.equal(r.msu,Number(expected[i].msu));close(r.deltaV,Number(expected[i].deltaV));});
});
test('costs reuse exact reference functions, apply planet count and T18-only discount',()=>{
 for(const type of P.types){const a=P.cost(s(),type),b=P.cost(s({planets:9}),type);assert.equal(a.units,2n*b.units);}
 assert.notEqual(P.value(s()).resource,P.value(s({planets:9})).resource);
 for(const type of P.types){const a=P.cost(s({labLevel:0}),type),b=P.cost(s({labLevel:100}),type);if(type==='t18')assert.ok(b.units<a.units);else assert.equal(a.units,b.units);}
 const c=P.cost(s(),'t18');assert.equal(c.resources.metal,O.generalCostAtLevel(8,25).metal*18n);
});
test('one resource building changes exactly one third of base MSU; no lithium cost effect',()=>{
 const a=P.value(s()),b=P.value(s({metal:16}));
 close(b.resource-a.resource,a.resource/(1+.002*18*15)*(.002*18/3));
 assert.equal(a.netLithium,b.netLithium);
 const t=P.value(s({t18:8}));assert.equal(a.claim,t.claim);assert.equal(a.search,t.search);
});
test('scanner lithium scaling assumption affects rewards; costs scale in both modes',()=>{
 for(const scaleLithium of [false,true]){const a=P.value(s({scaleLithium})),b=P.value(s({scaleLithium,scannerLevel:40}));close(b.lithium/a.lithium,scaleLithium?b.q/a.q:1);close(b.claim/a.claim,b.q/a.q);close(b.search/a.search,b.q/a.q);}
});
test('candidates are recomputed, all steps positive, totals and snapshots reconcile',()=>{
 const initial=s({steps:100,scaleLithium:true}),r=P.generate(initial);let state=initial,total=0n;
 for(const row of r.rows){const best=P.candidates(state).find(x=>x.deltaV>0);assert.equal(row.type,best.type);assert.ok(row.deltaV>0);assert.equal(row.state[row.type],state[row.type]+1);total+=row.units;assert.equal(total,row.totalUnits);state=row.state;}
 assert.equal(total,r.totalUnits);assert.equal(r.slices.reduce((a,x)=>a+x.transitionUnits,0n),total);
 assert.ok(r.slices.length>1);assert.equal(r.slices.at(-1).complete,false);
 for(const x of r.slices.filter(x=>x.complete)){assert.equal(r.rows[x.step].type,'scannerLevel');assert.equal(x.state.scannerLevel,r.rows[x.step].from);}
});
test('budget is exact, never exceeded; no cheaper substitution for the best step',()=>{
 const best=P.candidates(s())[0];assert.equal(P.generate(s({budget:'0'})).rows.length,0);
 const r=P.generate(s({budget:String(best.msu)}));assert.equal(r.rows.length,1);assert.equal(r.totalUnits,best.units);assert.equal(r.reason,'budget');
 assert.equal(P.budgetUnits('9007199254740993.5'),18014398509481987n);
 assert.equal(P.budgetUnits('0,5'),1n);assert.throws(()=>P.budgetUnits('1.2'));
});
test('negative V keeps absolute selection and marks relative gain undefined',()=>{
 const initial=s({lithiumValue:1e6});assert.ok(P.value(initial).v<0);
 const r=P.generate(initial);assert.ok(r.rows.length);assert.equal(r.rows[0].relative,null);assert.ok(r.rows.every(x=>x.deltaV>0));
});
test('non-General excludes T18, caps and invalid input are explicit',()=>{
 for(const playerClass of ['collector','discoverer'])assert.ok(P.generate(s({playerClass})).rows.every(x=>x.type!=='t18'));
 const max=s({scannerLevel:80,metal:50,crystal:50,deut:50,lithium:50,t18:80});assert.equal(P.generate(max).reason,'noGain');
 for(const patch of [{planets:0},{scannerLevel:81},{metal:NaN},{t18:Infinity},{economy:5},{lithiumValue:-1},{experience:101},{scaleLithium:'yes'},{budget:'1e1000'}])assert.throws(()=>P.generate(s(patch)),RangeError);
});
test('browser adapter generates both tables, validates, resets, localizes and restores links',()=>{
 const elements={};const el=id=>elements[id]??=( {value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,checked:false,handlers:{},addEventListener(k,fn){this.handlers[k]=fn},setAttribute(){}} );
 const context=vm.createContext({OrionPlanner:P,Orion:O,URL,URLSearchParams,Intl,Number,BigInt,Math,document:{getElementById:el,documentElement:{dataset:{}}},location:{href:'https://example.com/planner.html',search:''},history:{replaceState(){}},navigator:{clipboard:{async writeText(){}}}});
 vm.runInContext(fs.readFileSync(require.resolve('../planner.js'),'utf8'),context);
 assert.match(el('results').innerHTML,/planner-table/);assert.match(el('results').innerHTML,/snapshot-table/);
 el('planets').value='0';el('planets').handlers.input();assert.equal(el('generate').disabled,true);assert.equal(el('results').innerHTML,'');
 el('reset').handlers.click();assert.equal(el('generate').disabled,false);assert.match(el('results').innerHTML,/T18/);
 el('langEn').handlers.click();assert.match(el('results').innerHTML,/Every step/);
 el('budget').value='0';el('budget').handlers.input();el('generate').handlers.click();assert.match(el('results').innerHTML,/No upgrades selected/);
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../planner-core.js');
test('automatic threshold matches exhaustive manual threshold search for classes, missions and slots',()=>{
 for(const playerClass of ['general','discoverer','collector'])for(const mission of ['pvp','pve','all'])for(const slots of [1,6]){
  const s={...P.defaults,playerClass,mission,slots,metal:12,crystal:16,deut:18};
  const thresholds=[0,...new Set(P.selection({...s,threshold:0}).batches.flat().map(x=>x.ratio))].filter(x=>x<=1000);
  const best=Math.max(...thresholds.map(threshold=>P.value({...s,threshold}).dailyIncome));
  const auto=P.value({...s,thresholdMode:'auto'});
  assert.ok(Math.abs(auto.dailyIncome-best)<=Math.max(1,best)*1e-12);
  assert.equal(P.value({...s,threshold:auto.threshold}).selected,auto.selected);
 }
});
test('discoverer recovers empty manual selection and plans without T18 at every step',()=>{
 const s={...P.defaults,playerClass:'discoverer'};
 assert.equal(P.value(s).selected,0);
 const auto={...s,thresholdMode:'auto'},v=P.value(auto),r=P.generate(auto);
 assert.ok(v.dailyIncome>0);assert.equal(v.pvp,1);assert.equal(v.pve,1);
 assert.equal(P.value({...auto,t18:80}).dailyIncome,v.dailyIncome);
 assert.equal(r.rows.length,50);assert.ok(r.rows.every(x=>x.type!=='t18'));
 for(const row of r.rows){const fresh=P.value(row.state);assert.equal(row.metrics.threshold,fresh.threshold);assert.equal(row.metrics.dailyIncome,fresh.dailyIncome);}
 assert.equal(P.session(auto,16).status,'ok');
});

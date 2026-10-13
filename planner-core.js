/* Uses the rewards calculator's unchanged model and exact IAS / Orion / T18 costs.
 * No re-selection of the experimental 102 flights is performed. */
(function(root) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./rewards-core.js') : root.Orion;
  const defaults = Object.freeze({planets:18,economy:10,playerClass:'general',scannerLevel:39,metal:15,crystal:15,deut:15,lithium:18,t18:7,experience:100,techBoost:7.5,labLevel:25,lithiumValue:40,steps:50,budget:'',scaleLithium:false});
  const types = ['scannerLevel','metal','crystal','deut','lithium','t18'];
  const caps = {scannerLevel:80,metal:50,crystal:50,deut:50,lithium:50,t18:80};
  // Budgets are exact half-MSU units, matching M + 1.5 C + 3 D.
  function budgetUnits(value) {
    if(value === '') return null;
    const s=String(value).trim().replace(',','.');
    if(!/^\d+(?:\.[05])?$/.test(s) || s.length>80) throw new RangeError('budget');
    const [whole,decimal='0']=s.split('.');
    return BigInt(whole)*2n+(decimal==='5'?1n:0n);
  }
  function validate(s) {
    const errors=[];
    const ranges={planets:[1,50],scannerLevel:[1,80],metal:[0,50],crystal:[0,50],deut:[0,50],lithium:[0,50],t18:[0,80],experience:[0,100],labLevel:[0,100]};
    for(const [k,[min,max]] of Object.entries(ranges)) if(!Number.isInteger(s[k])||s[k]<min||s[k]>max)errors.push(k);
    for(const [k,max] of [['techBoost',1000],['lithiumValue',1e9]])if(!Number.isFinite(s[k])||s[k]<0||s[k]>max)errors.push(k);
    if(s.economy!==10)errors.push('economy');
    if(!['general','collector','discoverer'].includes(s.playerClass))errors.push('playerClass');
    if(![10,50,100].includes(s.steps))errors.push('steps');
    if(typeof s.scaleLithium!=='boolean')errors.push('scaleLithium');
    try{budgetUnits(s.budget);}catch{errors.push('budget');}
    return errors;
  }
  function value(s) {
    const errors=validate(s);if(errors.length)throw new RangeError(errors.join(','));
    const q=s.planets*O.lithiumPerPlanet(s.scannerLevel),scannerScale=q/O.baseline.lithiumPerHour;
    const e=.002*s.t18*s.planets*(1+.001*s.experience+s.techBoost/100);
    const pve=s.playerClass==='general'?1.5+.5*e:1,pvp=s.playerClass==='general'?2+e:1;
    // Each resource is exactly one third of BASE MSU, not raw resource units.
    const resourceBonus=.002*s.planets*(s.metal+s.crystal+s.deut)/3;
    const reward=O.meanRewards(pve,pvp,resourceBonus,.002*s.planets*s.lithium,scannerScale,s.scaleLithium?scannerScale:1);
    const claim=O.baseline.meanClaimCost*scannerScale;
    const search=O.baseline.scanPrice*O.baseline.scans/O.baseline.selectedFlights*scannerScale;
    const netLithium=reward.lithium-claim-search,v=reward.resource+s.lithiumValue*netLithium;
    const result={ias:s.planets*s.scannerLevel,q,scannerScale,e,pve,pvp,resource:reward.resource,lithium:reward.lithium,claim,search,netLithium,v};
    if(Object.values(result).some(x=>!Number.isFinite(x)))throw new RangeError('overflow');
    return result;
  }
  function cost(s,type) {
    if(!types.includes(type))throw new RangeError('type');
    const n=s[type]+1;
    const raw=type==='scannerLevel'?O.scannerCostAtLevel(n):type==='t18'?O.generalCostAtLevel(n,s.labLevel):O.resourceCostAtLevel(n,type);
    const resources=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,v*BigInt(s.planets)]));
    const units=O.twiceMsu(resources),msu=Number(units)/2;
    if(!Number.isFinite(msu)||msu<=0)throw new RangeError('overflow');
    return {resources,units,msu};
  }
  function candidates(s,current=value(s)) {
    return types.filter(type=>s[type]<caps[type]&&(type!=='t18'||s.playerClass==='general')).map(type=>{
      const after={...s,[type]:s[type]+1},metrics=value(after),price=cost(s,type),deltaV=metrics.v-current.v;
      return {type,from:s[type],to:after[type],state:after,metrics,...price,deltaV,deltaResource:metrics.resource-current.resource,deltaLithium:metrics.netLithium-current.netLithium,efficiency:deltaV/price.msu,costPerGain:deltaV>0?price.msu/deltaV:null,relative:current.v>0?deltaV/current.v:null};
    }).sort((a,b)=>b.efficiency-a.efficiency||(a.units<b.units?-1:a.units>b.units?1:types.indexOf(a.type)-types.indexOf(b.type)));
  }
  function generate(initial) {
    const errors=validate(initial);if(errors.length)throw new RangeError(errors.join(','));
    const budget=budgetUnits(initial.budget),start=value(initial),rows=[],slices=[];
    let s={...initial},current=start,total=0n,previousSlice=0n,reason='steps';
    function slice(complete) {
      const scannerPrice=s.scannerLevel<caps.scannerLevel?cost(s,'scannerLevel'):null;
      slices.push({state:{...s},metrics:{...current},step:rows.length,totalUnits:total,transitionUnits:total-previousSlice,scannerUnits:scannerPrice?.units??null,complete});
      previousSlice=total;
    }
    for(let i=0;i<initial.steps;i++) {
      const best=candidates(s,current).find(c=>c.deltaV>0);
      if(!best){reason='noGain';break;}
      if(budget!==null&&total+best.units>budget){reason='budget';break;}
      if(best.type==='scannerLevel')slice(true);
      total+=best.units;rows.push({...best,step:i+1,totalUnits:total});s=best.state;current=best.metrics;
    }
    slice(false);
    return {start,final:current,state:s,rows,slices,totalUnits:total,reason};
  }
  const api={defaults,types,caps,budgetUnits,validate,value,cost,candidates,generate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrionPlanner=api;
})(globalThis);

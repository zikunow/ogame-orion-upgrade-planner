/* Resource percentage planner. Exact costs are shared with the existing calculators. */
(function(root) {
  'use strict';
  const O = typeof module !== 'undefined' && module.exports ? require('./planner-costs.js') : root.OrionCosts;
  const defaults = Object.freeze({planets:18,playerClass:'general',mission:'pvp',scannerLevel:39,metal:15,crystal:15,deut:15,t18:7,experience:100,techBoost:7.5,labLevel:25,steps:50,budget:''});
  const types = ['scannerLevel','metal','crystal','deut','t18'];
  const caps = {scannerLevel:80,metal:50,crystal:50,deut:50,t18:80};
  function budgetUnits(value) {
    if(value === '') return null;
    const s=String(value).trim().replace(',','.');
    if(!/^\d+(?:\.[05])?$/.test(s) || s.length>80) throw new RangeError('budget');
    const [whole,decimal='0']=s.split('.');
    return BigInt(whole)*2n+(decimal==='5'?1n:0n);
  }
  function validate(s) {
    const errors=[];
    const ranges={planets:[1,50],scannerLevel:[1,80],metal:[0,50],crystal:[0,50],deut:[0,50],t18:[0,80],experience:[0,100],labLevel:[0,100]};
    for(const [k,[min,max]] of Object.entries(ranges)) if(!Number.isInteger(s[k])||s[k]<min||s[k]>max)errors.push(k);
    if(!Number.isFinite(s.techBoost)||s.techBoost<0||s.techBoost>1000)errors.push('techBoost');
    if(!['general','collector','discoverer'].includes(s.playerClass))errors.push('playerClass');
    if(!['pvp','pve'].includes(s.mission))errors.push('mission');
    if(![10,50,100].includes(s.steps))errors.push('steps');
    try{budgetUnits(s.budget);}catch{errors.push('budget');}
    return errors;
  }
  function value(s) {
    const errors=validate(s);if(errors.length)throw new RangeError(errors.join(','));
    // Scanner-dependent resource reward multiplier, normalized to level 39.
    // No absolute reward amounts, flight averages or expenditure balances are used.
    const scannerFactor=O.scannerRewardPotential(s.scannerLevel)/O.scannerRewardPotential(39);
    const e=.002*s.t18*s.planets*(1+.001*s.experience+s.techBoost/100);
    const classFactor=s.playerClass==='general'?(s.mission==='pvp'?2+e:1.5+.5*e):1;
    const resourceBonus=.002*s.planets*(s.metal+s.crystal+s.deut)/3;
    const resourceFactor=1+resourceBonus,index=scannerFactor*resourceFactor*classFactor;
    const result={ias:s.planets*s.scannerLevel,scannerFactor,e,classFactor,resourceBonus,resourceFactor,index};
    if(Object.values(result).some(x=>!Number.isFinite(x))||index<=0)throw new RangeError('overflow');
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
      const after={...s,[type]:s[type]+1},metrics=value(after),price=cost(s,type);
      const gainPercent=(metrics.index/current.index-1)*100;
      return {type,from:s[type],to:after[type],state:after,metrics,...price,gainPercent,efficiency:gainPercent/price.msu,msuPerPercent:gainPercent>0?price.msu/gainPercent:null};
    }).sort((a,b)=>b.efficiency-a.efficiency||(a.units<b.units?-1:a.units>b.units?1:types.indexOf(a.type)-types.indexOf(b.type)));
  }
  function generate(initial) {
    const errors=validate(initial);if(errors.length)throw new RangeError(errors.join(','));
    const budget=budgetUnits(initial.budget),start=value(initial),rows=[],slices=[];
    let s={...initial},current=start,total=0n,previousSlice=0n,reason='steps';
    function slice(complete) {
      const scannerPrice=s.scannerLevel<caps.scannerLevel?cost(s,'scannerLevel'):null;
      slices.push({state:{...s},metrics:{...current},step:rows.length,totalUnits:total,transitionUnits:total-previousSlice,scannerUnits:scannerPrice?.units??null,complete,totalGainPercent:(current.index/start.index-1)*100});
      previousSlice=total;
    }
    for(let i=0;i<initial.steps;i++) {
      const best=candidates(s,current).find(c=>c.gainPercent>0);
      if(!best){reason='noGain';break;}
      if(budget!==null&&total+best.units>budget){reason='budget';break;}
      if(best.type==='scannerLevel')slice(true);
      total+=best.units;s=best.state;current=best.metrics;
      rows.push({...best,step:i+1,totalUnits:total,totalGainPercent:(current.index/start.index-1)*100});
    }
    slice(false);
    return {start,final:current,state:s,rows,slices,totalUnits:total,reason,totalGainPercent:(current.index/start.index-1)*100};
  }
  const api={defaults,types,caps,budgetUnits,validate,value,cost,candidates,generate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrionPlanner=api;
})(globalThis);

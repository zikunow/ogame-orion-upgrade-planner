/* Formulas ported from the IAS project's app.js, resources.js and general.js.
 * Reward baseline supplied by the experiment; selection is held fixed. */
(function (root) {
  'use strict';
  const baseline = Object.freeze({economy:10,planets:18,scannerLevel:39,ias:702,lithiumPerHour:4436514,scanPrice:2218257,resultsPerScan:6,scans:313,anomalies:1878,selectedFlights:102,meanClaimCost:21717567.43137255,
    pve:{flights:12,baseMsuSum:247005407.19766924,baseLithiumSum:107452034.20347393},
    pvp:{flights:90,baseMsuSum:22762786610.090557,baseLithiumSum:647816510.3907931}});
  const defaults = Object.freeze({playerClass:'general',economy:10,planets:18,scannerLevel:39,race:'mecha',experience:100,techBoost:7.5,labLevel:25,t18:7,resourceLevel:15,lithiumLevel:18,availableSlots:6,resultsPerScan:6,launchesPerDay:6,usedSlots:6,scaleLithium:false});
  const ranges={planets:[1,50],scannerLevel:[1,80],experience:[0,100],techBoost:[0,1000],labLevel:[0,100],t18:[0,80],resourceLevel:[0,50],lithiumLevel:[0,50],availableSlots:[1,100],resultsPerScan:[1,100],launchesPerDay:[0,1000],usedSlots:[1,100]};
  function validate(s){
    const errors=[];
    for(const [key,[min,max]] of Object.entries(ranges)) if(!Number.isFinite(s[key])||s[key]<min||s[key]>max||(key!=='techBoost'&&!Number.isInteger(s[key]))) errors.push(key);
    if(s.economy!==10) errors.push('economy');
    if(!['general','collector','discoverer'].includes(s.playerClass)) errors.push('playerClass');
    if(!['human','rocktal','mecha','kaelesh'].includes(s.race)) errors.push('race');
    if(typeof s.scaleLithium!=='boolean') errors.push('scaleLithium');
    if(s.usedSlots>s.availableSlots) errors.push('slots');
    return errors;
  }
  const zero=()=>({metal:0n,crystal:0n,deut:0n});
  const add=(a,b)=>({metal:a.metal+b.metal,crystal:a.crystal+b.crystal,deut:a.deut+b.deut});
  const scale=(a,p)=>Object.fromEntries(Object.entries(a).map(([k,v])=>[k,v*BigInt(p)]));
  function fromArray(a){return {metal:a[0],crystal:a[1],deut:a[2]};}
  function scannerCostAtLevel(l){
    if(!l)return zero();
    const n=3n**BigInt(l-1),d=2n**BigInt(l-1);
    return fromArray([90n,45n,15n].map(b=>(b*n*2n+d)/(2n*d)));
  }
  const bases={metal:[112500n,37500n,18000n],crystal:[37500n,67500n,27000n],deut:[30000n,37500n,45000n],lithium:[52500n,37500n,37500n]};
  function resourceCostAtLevel(l,type){
    if(!l)return zero();
    const n=3n**BigInt(l-1),d=2n**BigInt(l-1);
    return fromArray(bases[type].map(b=>b*n/d));
  }
  function generalCostAtLevel(l,h){
    if(!l)return zero();
    const n=BigInt(l)*17n**BigInt(l-1)*BigInt(400-Math.min(h,100)),d=10n**BigInt(l-1)*400n;
    return fromArray([300000n,180000n,120000n].map(b=>b*n/d));
  }
  function cumulative(l,p,fn){let a=zero();for(let i=1;i<=l;i++)a=add(a,fn(i));return scale(a,p);}
  // Twice MSU stays integral even when crystal has a half-MSU contribution.
  const twiceMsu=a=>2n*a.metal+3n*a.crystal+6n*a.deut;
  const lithiumPerPlanet=l=>l?Number(4224n*BigInt(l)*11n**BigInt(l-1)/(25n*10n**BigInt(l-1))):0;
  function meanRewards(pve,pvp,resourceBonus,lithiumBonus,scannerScale=1,lithiumScale=1){return {
    resource:(baseline.pve.baseMsuSum*pve+baseline.pvp.baseMsuSum*pvp)/102*scannerScale*(1+resourceBonus),
    lithium:(baseline.pve.baseLithiumSum*pve+baseline.pvp.baseLithiumSum*pvp)/102*lithiumScale*(1+lithiumBonus)};}
  function calculate(s){
    const errors=validate(s);if(errors.length)throw new RangeError(errors.join(','));
    const ias=s.planets*s.scannerLevel,q=s.planets*lithiumPerPlanet(s.scannerLevel),scannerScale=q/baseline.lithiumPerHour;
    const enhancement=.002*s.t18*s.planets*(1+.001*s.experience+s.techBoost/100);
    const pve=s.playerClass==='general'?1.5+.5*enhancement:1,pvp=s.playerClass==='general'?2+enhancement:1;
    const resourceBonus=.002*s.planets*s.resourceLevel,lithiumBonus=.002*s.planets*s.lithiumLevel;
    const rewards=meanRewards(pve,pvp,resourceBonus,lithiumBonus,scannerScale,s.scaleLithium?scannerScale:1);
    const claim=baseline.meanClaimCost*scannerScale,scan=q/2,scansPerFlight=1/(s.resultsPerScan*(102/1878));
    const flights=s.launchesPerDay*s.usedSlots,scans=flights*scansPerFlight;
    const costs={scanner:cumulative(s.scannerLevel,s.planets,scannerCostAtLevel),
      metal:cumulative(s.resourceLevel,s.planets,l=>resourceCostAtLevel(l,'metal')),
      crystal:cumulative(s.resourceLevel,s.planets,l=>resourceCostAtLevel(l,'crystal')),
      deut:cumulative(s.resourceLevel,s.planets,l=>resourceCostAtLevel(l,'deut')),
      lithium:cumulative(s.lithiumLevel,s.planets,l=>resourceCostAtLevel(l,'lithium')),
      t18:cumulative(s.t18,s.planets,l=>generalCostAtLevel(l,s.labLevel))};
    const total=Object.values(costs).reduce(add,zero());
    return {ias,q,scannerScale,enhancement,pve,pvp,resourceBonus,lithiumBonus,rewards,claim,scan,scansPerFlight,costs,total,
      daily:{flights,scans,scanBudget:Math.ceil(scans)*scan,resources:rewards.resource*flights,lithium:rewards.lithium*flights,claimCost:claim*flights,scanCost:scans*scan,lithiumChange:(rewards.lithium-claim)*flights-scans*scan}};
  }
  const api={baseline,defaults,ranges,validate,scannerCostAtLevel,resourceCostAtLevel,generalCostAtLevel,cumulative,lithiumPerPlanet,twiceMsu,meanRewards,calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Orion=api;
})(globalThis);

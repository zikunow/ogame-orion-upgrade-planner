/* Exact rational cost functions from the IAS, Orion buildings and General T18 calculators. */
(function(root){
  'use strict';
  const zero=()=>({metal:0n,crystal:0n,deut:0n});
  const fromArray=a=>({metal:a[0],crystal:a[1],deut:a[2]});
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
  const twiceMsu=a=>2n*a.metal+3n*a.crystal+6n*a.deut;
  const scannerRewardPotential=l=>l?Number(4224n*BigInt(l)*11n**BigInt(l-1)/(25n*10n**BigInt(l-1))):0;
  const lithiumPerPlanet=(l,economy=10)=>Number(4224n*BigInt(economy)*BigInt(l)*11n**BigInt(l-1)/(250n*10n**BigInt(l-1)));
  const api={scannerCostAtLevel,resourceCostAtLevel,generalCostAtLevel,twiceMsu,scannerRewardPotential,lithiumPerPlanet};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrionCosts=api;
})(globalThis);


/* Greedy account-wide upgrades ranked by sustainable calendar-day income. */
(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const O=node?require('./planner-costs.js'):root.OrionCosts;
  const sample=node?require('./anomaly-sample.js'):root.OrionSample;
  const defaults=Object.freeze({planets:18,playerClass:'general',mission:'pvp',scannerLevel:39,metal:15,crystal:15,deut:15,lithium:17,t18:7,experience:100,techBoost:7.5,labLevel:25,economy:10,fleetSpeed:2,slots:6,threshold:28.4,thresholdMode:'manual',baseCashback:5,reservePercent:20,steps:50,budget:''});
  const types=['scannerLevel','metal','crystal','deut','lithium','t18'];
  const caps={scannerLevel:80,metal:50,crystal:50,deut:50,lithium:50,t18:80};
  function budgetUnits(value){
    if(value==='')return null;
    const text=String(value).trim().replace(',','.');
    if(!/^\d+(?:\.[05])?$/.test(text)||text.length>80)throw new RangeError('budget');
    const [whole,decimal='0']=text.split('.');
    return BigInt(whole)*2n+(decimal==='5'?1n:0n);
  }
  function validate(s){
    const errors=[];
    const integer={planets:[1,50],scannerLevel:[1,80],metal:[0,50],crystal:[0,50],deut:[0,50],lithium:[0,50],t18:[0,80],experience:[0,100],labLevel:[0,100],economy:[1,10],slots:[1,100]};
    for(const [key,[min,max]]of Object.entries(integer))if(!Number.isInteger(s[key])||s[key]<min||s[key]>max)errors.push(key);
    for(const [key,min,max]of [['techBoost',0,1000],['fleetSpeed',.1,20],['threshold',0,1000],['baseCashback',0,25],['reservePercent',1,90]])if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)errors.push(key);
    if(s.thresholdMode!==undefined&&!['auto','manual'].includes(s.thresholdMode))errors.push('thresholdMode');
    if(!['general','collector','discoverer'].includes(s.playerClass))errors.push('playerClass');
    if(!['pvp','pve','all'].includes(s.mission))errors.push('mission');
    if(![10,50,100].includes(s.steps))errors.push('steps');
    try{budgetUnits(s.budget);}catch{errors.push('budget');}
    if(s.baseCashback/100*(1+.002*s.planets*s.lithium)>=1)errors.push('baseCashback');
    return [...new Set(errors)];
  }
  function selection(s){
    const errors=validate(s);if(errors.length)throw new RangeError(errors.join(','));
    const production=s.planets*O.lithiumPerPlanet(s.scannerLevel,s.economy),scale=production/sample.lithiumPerHour;
    const e=.002*s.t18*s.planets*(1+.001*s.experience+s.techBoost/100);
    const pvp=s.playerClass==='general'?2+e:1,pve=s.playerClass==='general'?1.5+.5*e:1;
    const bonuses=[s.metal,s.crystal,s.deut].map(l=>1+.002*s.planets*l);
    const cashback=s.baseCashback/100*(1+.002*s.planets*s.lithium);
    const batches=sample.scans.map(batch=>batch.flatMap(row=>{
      const [isPvp,m,c,d,claim,minutes]=row;
      if(s.mission!=='all'&&Boolean(isPvp)!==(s.mission==='pvp'))return [];
      const factor=(isPvp?pvp/sample.generalPvp:pve/sample.generalPve)*scale/(1+sample.resourceBonus);
      const reward=(m*bonuses[0]+1.5*c*bonuses[1]+3*d*bonuses[2])*factor;
      const cost=claim*scale,ratio=cost>0?reward/cost:0;
      return reward>0&&(s.thresholdMode==='auto'||ratio>=s.threshold)?[{reward,cost,minutes:minutes*sample.fleetSpeed/s.fleetSpeed,ratio}]:[];
    }));
    let threshold=s.threshold;
    if(s.thresholdMode==='auto'){
      // Every distinct reward/claim ratio defines one possible threshold selection.
      const rows=batches.flat().sort((a,b)=>b.ratio-a.ratio);
      let reward=0,cost=0,minutes=0,best=-1;
      threshold=0;
      for(let i=0;i<rows.length;i++){
        reward+=rows[i].reward;cost+=rows[i].cost;minutes+=rows[i].minutes;
        if(i+1<rows.length&&rows[i+1].ratio===rows[i].ratio)continue;
        const net=cost*(1-cashback)+production/2*sample.scans.length;
        const income=Math.min(24*production/net,s.slots*1440/minutes)*reward;
        if(rows[i].ratio<=1000&&income>best){best=income;threshold=rows[i].ratio;}
      }
      for(let i=0;i<batches.length;i++)batches[i]=batches[i].filter(row=>row.ratio>=threshold);
    }
    return {production,scale,e,pvp,pve,bonuses,cashback,batches,threshold};
  }
  function value(s){
    const a=selection(s),chosen=a.batches.flat(),n=chosen.length;
    const sum=key=>chosen.reduce((v,r)=>v+r[key],0);
    const meanClaimCost=n?sum('cost')/n:0,meanReward=n?sum('reward')/n:0,meanMinutes=n?sum('minutes')/n:0;
    const scanPrice=a.production/2,scansPerFlight=n?sample.scans.length/n:0;
    const netPerFlight=n?meanClaimCost*(1-a.cashback)+scanPrice*scansPerFlight:0;
    const lithiumFlights=n?24*a.production/netPerFlight:0,slotFlights=n?s.slots*1440/meanMinutes:0;
    const flightsPerDay=Math.min(lithiumFlights,slotFlights),dailyIncome=meanReward*flightsPerDay;
    return {threshold:a.threshold,pvp:a.pvp,pve:a.pve,ias:s.planets*s.scannerLevel,production:a.production,scale:a.scale,e:a.e,classFactor:s.mission==='pve'?a.pve:a.pvp,
      cashback:a.cashback,lithiumBonus:.002*s.planets*s.lithium,selected:n,acceptance:n/(sample.scans.length*6),meanClaimCost,meanReward,meanMinutes,
      scanPrice,scansPerFlight,netPerFlight,lithiumFlights,slotFlights,flightsPerDay,dailyIncome,index:dailyIncome,
      weeklyCap:168*a.production,reserve:168*a.production*s.reservePercent/100,slotLimited:slotFlights<lithiumFlights};
  }
  function cost(s,type){
    if(!types.includes(type))throw new RangeError('type');
    const next=s[type]+1;
    const raw=type==='scannerLevel'?O.scannerCostAtLevel(next):type==='t18'?O.generalCostAtLevel(next,s.labLevel):O.resourceCostAtLevel(next,type);
    const resources=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,v*BigInt(s.planets)]));
    const units=O.twiceMsu(resources),msu=Number(units)/2;
    if(!Number.isFinite(msu)||msu<=0)throw new RangeError('overflow');
    return {resources,units,msu};
  }
  function candidates(s,current=value(s)){
    return types.filter(type=>s[type]<caps[type]&&(type!=='t18'||s.playerClass==='general')).map(type=>{
      const after={...s,[type]:s[type]+1};if(validate(after).length)return null;
      const metrics=value(after),price=cost(s,type),dailyGain=metrics.dailyIncome-current.dailyIncome;
      const gainPercent=current.dailyIncome>0?dailyGain/current.dailyIncome*100:null;
      return {type,from:s[type],to:after[type],state:after,metrics,...price,dailyGain,gainPercent,
        efficiency:dailyGain/price.msu,msuPerPercent:gainPercent>0?price.msu/gainPercent:null,paybackDays:dailyGain>0?price.msu/dailyGain:null};
    }).filter(Boolean).sort((a,b)=>b.efficiency-a.efficiency||(a.units<b.units?-1:a.units>b.units?1:types.indexOf(a.type)-types.indexOf(b.type)));
  }
  function generate(initial){
    const errors=validate(initial);if(errors.length)throw new RangeError(errors.join(','));
    const budget=budgetUnits(initial.budget),start=value(initial),rows=[],slices=[];
    let s={...initial},current=start,total=0n,previousSlice=0n,reason='steps';
    const gain=()=>start.dailyIncome>0?(current.dailyIncome/start.dailyIncome-1)*100:null;
    function slice(complete){
      const scannerPrice=s.scannerLevel<caps.scannerLevel?cost(s,'scannerLevel'):null;
      slices.push({state:{...s},metrics:{...current},step:rows.length,totalUnits:total,transitionUnits:total-previousSlice,scannerUnits:scannerPrice?.units??null,complete,totalGainPercent:gain()});previousSlice=total;
    }
    for(let i=0;i<initial.steps;i++){
      const best=candidates(s,current).find(c=>c.dailyGain>0);
      if(!best){reason=current.selected?'noGain':'noTargets';break;}
      if(budget!==null&&total+best.units>budget){reason='budget';break;}
      if(best.type==='scannerLevel')slice(true);
      total+=best.units;s=best.state;current=best.metrics;
      rows.push({...best,step:i+1,totalUnits:total,totalGainPercent:gain()});
    }
    slice(false);
    return {start,final:current,state:s,rows,slices,totalUnits:total,reason,totalGainPercent:gain()};
  }
  function session(s,runs=256){
    if(!Number.isInteger(runs)||runs<1||runs>4096)throw new RangeError('runs');
    const a=selection(s),v=value(s);
    if(!v.selected)return {status:'noTargets',runs,resource:0,flights:0,scans:0,activeHours:null,waitDays:null,cycleDays:null};
    if(v.slotLimited)return {status:'continuous',runs,resource:null,flights:null,scans:null,activeHours:null,waitDays:null,cycleDays:null};
    let seed=20261030;
    function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;}
    const totals={resource:0,flights:0,scans:0,activeHours:0,waitDays:0,cycleDays:0,endLithium:0,capWaste:0,netSpent:0};
    for(let run=0;run<runs;run++){
      let cash=v.weeklyCap,reserved=0,now=0,reward=0,flights=0,scans=0,net=0,waste=0,stopped=false,pending=[];
      const active=[];
      for(let step=0;step<20000;step++){
        if(cash-(1-a.cashback)*reserved<=v.reserve)stopped=true;
        if(!stopped&&active.length<s.slots){
          if(pending.length){
            const target=pending.shift();
            if(target.cost<=cash-reserved){reserved+=target.cost;active.push({end:now+target.minutes,...target});flights++;}
            continue;
          }
          if(cash-reserved>=v.scanPrice){
            cash-=v.scanPrice;net+=v.scanPrice;scans++;
            if(cash-(1-a.cashback)*reserved<=v.reserve){stopped=true;continue;}
            pending=a.batches[Math.floor(random()*a.batches.length)].slice().sort((x,y)=>y.ratio-x.ratio);continue;
          }
        }
        if(!active.length)break;
        active.sort((x,y)=>x.end-y.end);const target=active.shift();
        const addition=(target.end-now)/60*a.production;
        waste+=Math.max(0,cash+addition-v.weeklyCap);cash=Math.min(v.weeklyCap,cash+addition);now=target.end;
        const debit=(1-a.cashback)*target.cost;cash-=debit;net+=debit;reserved-=target.cost;reward+=target.reward;
        if(step===19999)return {status:'simulationLimit',runs,activeHours:null,waitDays:null,cycleDays:null};
      }
      const activeHours=now/60,waitDays=Math.max(0,(v.weeklyCap-cash)/(24*a.production));
      const row={resource:reward,flights,scans,activeHours,waitDays,cycleDays:activeHours/24+waitDays,endLithium:cash,capWaste:waste,netSpent:net};
      for(const key of Object.keys(totals))totals[key]+=row[key];
    }
    for(const key of Object.keys(totals))totals[key]/=runs;
    return {status:'ok',runs,...totals,dailyIncome:totals.resource/totals.cycleDays};
  }
  const api={defaults,types,caps,budgetUnits,validate,selection,value,cost,candidates,generate,session,sampleInfo:{date:sample.date,scans:sample.scans.length,anomalies:sample.scans.length*6}};
  if(node)module.exports=api;else root.OrionPlanner=api;
})(globalThis);


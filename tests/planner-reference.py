"""Independent Decimal aggregation of the source sample, not a greedy-path mirror."""
import json
from decimal import Decimal as D, getcontext
from pathlib import Path
getcontext().prec=55
root=Path(__file__).resolve().parents[1]
text=(root/'anomaly-sample.js').read_text()
data=json.loads(text.split('const data=',1)[1].split(';\n',1)[0])
def expected(resource=17,t18=0,lithium=17,threshold='28.4'):
 p=18;l=39;production=p*(4224*10*l*11**(l-1)//(250*10**(l-1)))
 scale=D(production)/D(data['lithiumPerHour'])
 boost=D('.002')*t18*p*(1+D('.001')*100+D('.075'))
 rows=[]
 for batch in data['scans']:
  for mode,m,c,d,cost,minutes in batch:
   if not mode:continue
   reward=(D(m)+D('1.5')*c+D(3)*d)/(1+D('.612'))*(1+D('.002')*p*resource)*(2+boost)/2*scale
   price=D(cost)*scale
   if reward>0 and reward/price>=D(threshold):rows.append((reward,price,D(minutes)))
 n=len(rows);reward=sum(r[0] for r in rows)/n;claim=sum(r[1] for r in rows)/n
 scans=D(333)/n;cashback=D('.05')*(1+D('.002')*p*lithium)
 net=claim*(1-cashback)+D(production)/2*scans
 return {'selected':n,'production':production,'meanReward':str(reward),'meanClaimCost':str(claim),'scansPerFlight':str(scans),'netPerFlight':str(net),'dailyIncome':str(D(24)*production/net*reward),'cashback':str(cashback)}
print(json.dumps({'reference':expected(),'default':expected(15,7),'withoutLithium':expected(lithium=0)},indent=2))

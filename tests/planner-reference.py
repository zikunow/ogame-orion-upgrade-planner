"""Independent Decimal reference: does not import production JS.
Regenerate with python3 tests/planner-reference.py > tests/fixtures/planner-reference.json.
"""
from decimal import Decimal as D, getcontext, ROUND_FLOOR, ROUND_HALF_UP
import json
getcontext().prec=65
bases={'scannerLevel':[90,45,15],'metal':[112500,37500,18000],'crystal':[37500,67500,27000],'deut':[30000,37500,45000],'lithium':[52500,37500,37500],'t18':[300000,180000,120000]}
s={'scannerLevel':39,'metal':15,'crystal':15,'deut':15,'lithium':18,'t18':7}
def metrics(s,scales):
    q=18*(D('168.96')*s['scannerLevel']*D('1.1')**(s['scannerLevel']-1)).to_integral_value(rounding=ROUND_FLOOR)
    scale=q/D(4436514)
    e=D('.002')*s['t18']*18*(1+D('.1')+D('.075'))
    pve=D('1.5')+e/2;pvp=2+e
    resource=(D('247005407.19766924')*pve+D('22762786610.090557')*pvp)/102*scale*(1+D('.002')*18*(s['metal']+s['crystal']+s['deut'])/3)
    li=(D('107452034.20347393')*pve+D('647816510.3907931')*pvp)/102*(scale if scales else 1)*(1+D('.002')*18*s['lithium'])
    claim=D('21717567.43137255')*scale;search=D(2218257)*313/102*scale
    return resource+40*(li-claim-search)
def cost(s,k):
    n=s[k]+1
    factor=D('1.5')**(n-1) if k!='t18' else n*D('1.7')**(n-1)*D('.9375')
    res=[(D(b)*factor).to_integral_value(rounding=ROUND_HALF_UP if k=='scannerLevel' else ROUND_FLOOR) for b in bases[k]]
    return 18*(res[0]+D('1.5')*res[1]+3*res[2])
def path(scales):
    state=dict(s);out=[]
    for i in range(10):
        v=metrics(state,scales);candidates=[]
        for k in bases:
            nxt={**state,k:state[k]+1};delta=metrics(nxt,scales)-v;c=cost(state,k)
            if delta>0:candidates.append((delta/c,-c,-list(bases).index(k),k,nxt,delta,c))
        _,_,_,k,state,delta,c=max(candidates)
        out.append({'type':k,'to':state[k],'msu':str(c),'deltaV':str(delta)})
    return out
print(json.dumps({'unscaled':path(False),'scaled':path(True)},indent=2))

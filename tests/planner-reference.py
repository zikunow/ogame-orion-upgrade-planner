"""Independent Decimal percentage model; imports no production JS."""
from decimal import Decimal as D, getcontext, ROUND_FLOOR, ROUND_HALF_UP
import json
getcontext().prec=65
bases={'scannerLevel':[90,45,15],'metal':[112500,37500,18000],'crystal':[37500,67500,27000],'deut':[30000,37500,45000],'t18':[300000,180000,120000]}
initial={'scannerLevel':39,'metal':15,'crystal':15,'deut':15,'t18':7}
def factor(s,mission):
    scanner=(D('168.96')*s['scannerLevel']*D('1.1')**(s['scannerLevel']-1)).to_integral_value(rounding=ROUND_FLOOR)
    resources=1+D('.002')*18*(s['metal']+s['crystal']+s['deut'])/3
    e=D('.002')*s['t18']*18*D('1.175')
    general=2+e if mission=='pvp' else D('1.5')+e/2
    return scanner*resources*general

def cost(s,k):
    n=s[k]+1
    f=D('1.5')**(n-1) if k!='t18' else n*D('1.7')**(n-1)*D('.9375')
    res=[(D(b)*f).to_integral_value(rounding=ROUND_HALF_UP if k=='scannerLevel' else ROUND_FLOOR) for b in bases[k]]
    return 18*(res[0]+D('1.5')*res[1]+3*res[2])
def path(mission):
    s=dict(initial);out=[];start=factor(s,mission)
    for i in range(10):
        before=factor(s,mission);candidates=[]
        for k in bases:
            after={**s,k:s[k]+1};gain=(factor(after,mission)/before-1)*100;c=cost(s,k)
            if gain>0:candidates.append((gain/c,-c,-list(bases).index(k),k,after,gain,c))
        _,_,_,k,s,gain,c=max(candidates)
        out.append({'type':k,'to':s[k],'msu':str(c),'gainPercent':str(gain),'totalGainPercent':str((factor(s,mission)/start-1)*100)})
    return out
print(json.dumps({'pvp':path('pvp'),'pve':path('pve')},indent=2))

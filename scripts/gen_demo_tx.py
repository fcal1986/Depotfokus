# Erzeugt erfundene Musterumsätze passend zum Musterdepot (DEMO_CSV). Keine echten Daten.
import random,datetime as dt
random.seed(7)
P=[('IQQW.DE','IE00B0M62Q58','MSCI World USD (Dist)',40,93.156,.015),('K0MR.DE','IE000FPWSL69','Gerd Kommer Multifactor Equity USD (Dist)',150,14.414,.018),
('EQQQ.DE','IE0032077012','EQQQ Nasdaq 100 USD (Dist)',2,669.1,.005),('9A2.F','US04010L1035','Ares Capital',60,16.674,.09),('13M.F','US56035L1044','Main Street Capital',20,48.675,.06),
('WX4.F','US6819361006','Omega Healthcare Investors',25,40.01,.065),('RY6.F','US7561091049','Realty Income',20,47.94,.055),('PEP.DE','US7134481081','PepsiCo',10,111.6001678,.035),
('CCC3.DE','US1912161007','Coca-Cola',15,75.9,.029),('PRG.DE','US7427181091','Procter & Gamble',8,128.3609167,.026),('JNJ.DE','US4781601046','Johnson & Johnson',5,228.3501247,.03),
('NOV.DE','DK0062498333','Novo-Nordisk (B)',20,33.21,.02),('MSF.DE','US5949181045','Microsoft',4,457.35,.007),('3V64.DE','US92826C8394','Visa',4,319.2,.007),('AAPL','US0378331005','Apple',2,333.69,.005)]
start=dt.date(2023,1,15);end=dt.date(2026,9,30)
rows=[]
def d2(x):return f"{x:.2f}".replace('.',',')
def ds(d):return d.isoformat()
m=start
while m<=end:
    rows.append((m,'Einlage',500.0,0,0,'','','',''));m=(m.replace(day=1)+dt.timedelta(days=32)).replace(day=15)
lots={}
for sym,isin,name,q,px,y in P:
    n=1 if q<=4 else random.choice([2,3])
    parts=[];rest=q
    for i in range(n-1):
        k=max(1,round(q/n));parts.append(k);rest-=k
    parts.append(rest)
    days=sorted(random.sample(range(0,(dt.date(2026,6,30)-start).days),n))
    for k,dd in zip(parts,days):
        d=start+dt.timedelta(days=dd);f=random.uniform(.72,1.05);fee=1.0
        val=round(k*px*f+fee,2);rows.append((d,'Kauf',val,fee,0,k,isin,sym,name));lots.setdefault(sym,[]).append((d,k))
    if y>.004:
        qd=dt.date(2023,3,28)
        while qd<=end:
            sh=sum(k for d,k in lots[sym] if d<qd)
            if sh>0:
                gross=sh*px*.92*y/4;tax=round(gross*.26375*(.7 if sym in('IQQW.DE','K0MR.DE','EQQQ.DE') else 1),2)
                rows.append((qd,'Dividende',round(gross-tax,2),0,tax,sh,isin,sym,name))
            qd=(qd.replace(day=1)+dt.timedelta(days=95)).replace(day=28)
# eine vollständig verkaufte Position
rows.append((dt.date(2023,5,10),'Kauf',round(20*47.10+1,2),1.0,0,20,'GB00BVZK7T90','UNVB.DE','Unilever'))
rows.append((dt.date(2023,9,28),'Dividende',round(20*0.42*.7363,2),0,round(20*.42*.26375,2),20,'GB00BVZK7T90','UNVB.DE','Unilever'))
rows.append((dt.date(2025,3,12),'Verkauf',round(20*54.80-1,2),1.0,round((20*54.8-1-943)*.26375,2),20,'GB00BVZK7T90','UNVB.DE','Unilever'))
rows.append((dt.date(2026,1,2),'Gebühren',4.9,0,0,'','','','Depotgebühr'))
rows.sort(key=lambda r:r[0])
out=['Datum;Typ;Wert;Buchungswährung;Gebühren;Steuern;Stück;ISIN;Ticker-Symbol;Wertpapiername;Notiz']
for d,t,v,fee,tax,sh,isin,sym,name in rows:
    out.append(';'.join([ds(d),t,d2(v),'EUR',d2(fee),d2(tax),str(sh) if sh else '',isin,sym,name if t!='Gebühren' else '',name if t=='Gebühren' else '']))
open('/tmp/demo_tx.csv','w').write('\n'.join(out))
print(len(out))

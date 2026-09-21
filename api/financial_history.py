import json,re
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
import yfinance as yf

class handler(BaseHTTPRequestHandler):
 def out(self,s,p):
  b=json.dumps(p,ensure_ascii=False,allow_nan=False,default=str).encode('utf-8');self.send_response(s);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','s-maxage=600, stale-while-revalidate=1800');self.end_headers();self.wfile.write(b)
 def do_GET(self):
  try:
   q=parse_qs(urlparse(self.path).query);raw=(q.get('symbol',[''])[0] or '').upper().strip();sym=re.sub(r'[^A-Z0-9&.-]','',raw)
   if not sym:return self.out(400,{'error':'Symbol required'})
   t=sym if sym.endswith(('.NS','.BO')) else sym+'.NS';x=yf.Ticker(t);inc=x.income_stmt;bal=x.balance_sheet;cf=x.cashflow
   def val(df,names,col):
    if df is None or df.empty:return None
    for n in names:
     if n in df.index:
      try:
       v=df.loc[n,col]
       if hasattr(v,'iloc'):v=v.iloc[0]
       v=float(v);return v if v==v else None
      except:return None
    return None
   cols=[]
   for df in [inc,bal,cf]:
    if df is not None and not df.empty:
     cols.extend(list(df.columns))
   uniq=sorted(set(cols))[-5:]
   rows=[]
   for c in uniq:
    rev=val(inc,['Total Revenue','Operating Revenue'],c);ni=val(inc,['Net Income','Net Income Common Stockholders'],c);eps=val(inc,['Diluted EPS','Basic EPS'],c);debt=val(bal,['Total Debt'],c);eq=val(bal,['Stockholders Equity','Total Equity Gross Minority Interest'],c);ocf=val(cf,['Operating Cash Flow','Cash Flow From Continuing Operating Activities'],c)
    rows.append({'year':str(c)[:10],'revenue':rev,'netIncome':ni,'eps':eps,'debt':debt,'equity':eq,'operatingCashFlow':ocf,'netMargin':(ni/rev if ni is not None and rev else None),'debtEquity':(debt/eq if debt is not None and eq else None)})
   self.out(200,{'symbol':sym,'source':'Yahoo Finance via yfinance','rows':rows})
  except Exception as e:self.out(502,{'error':str(e)})
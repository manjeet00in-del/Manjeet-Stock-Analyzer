import json,re
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
import yfinance as yf
class handler(BaseHTTPRequestHandler):
 def out(self,s,p):
  b=json.dumps(p,ensure_ascii=False,allow_nan=False,default=str).encode();self.send_response(s);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','s-maxage=300');self.end_headers();self.wfile.write(b)
 def do_GET(self):
  try:
   q=parse_qs(urlparse(self.path).query);raw=(q.get('symbol',[''])[0] or '').upper();sym=re.sub(r'[^A-Z0-9&.-]','',raw);t=sym if sym.endswith(('.NS','.BO')) else sym+'.NS';x=yf.Ticker(t);i=x.info or {}
   keys=['longName','sector','industry','marketCap','trailingPE','forwardPE','priceToBook','returnOnEquity','debtToEquity','revenueGrowth','earningsGrowth','dividendYield','profitMargins','currentPrice','fiftyTwoWeekHigh','fiftyTwoWeekLow']
   d={k:i.get(k) for k in keys};self.out(200,{'symbol':sym,'source':'Yahoo Finance','data':d})
  except Exception as e:self.out(502,{'error':str(e)})
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import yfinance as yf

class handler(BaseHTTPRequestHandler):
    def _json(self,status,payload):
        body=json.dumps(payload,ensure_ascii=False).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Cache-Control','s-maxage=300, stale-while-revalidate=600'); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        try:
            q=(parse_qs(urlparse(self.path).query).get('q',[''])[0] or '').strip()
            if len(q)<2: return self._json(200,{'results':[]})
            s=yf.Search(q,max_results=25,news_count=0,enable_fuzzy_query=True)
            out=[]; seen=set()
            for x in (s.quotes or []):
                sym=str(x.get('symbol','')).upper()
                exch=str(x.get('exchange') or x.get('exchDisp') or '').upper()
                qt=str(x.get('quoteType','')).upper()
                if not sym.endswith(('.NS','.BO')): continue
                if qt and qt not in ('EQUITY','STOCK'): continue
                clean=sym[:-3]
                key=(clean,exch)
                if key in seen: continue
                seen.add(key)
                out.append({'symbol':clean,'ticker':sym,'name':x.get('longname') or x.get('shortname') or clean,'exchange':'NSE' if sym.endswith('.NS') else 'BSE'})
            out.sort(key=lambda x:(0 if x['exchange']=='NSE' else 1, x['name']))
            return self._json(200,{'query':q,'results':out[:20]})
        except Exception as e:
            return self._json(502,{'error':'Search failed: '+str(e),'results':[]})

import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import yfinance as yf

class handler(BaseHTTPRequestHandler):
    def _json(self,status,payload):
        body=json.dumps(payload,ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        try:
            q=(parse_qs(urlparse(self.path).query).get('q',[''])[0] or '').strip()
            if len(q)<2: return self._json(200,{'results':[]})
            # Yahoo's live search index, not a local fixed stock list.
            s=yf.Search(q,max_results=100,news_count=0,enable_fuzzy_query=True)
            out=[]; seen=set()
            for x in (s.quotes or []):
                sym=str(x.get('symbol','')).upper().strip()
                qt=str(x.get('quoteType','')).upper()
                if not sym.endswith(('.NS','.BO')): continue
                if qt and qt not in ('EQUITY','STOCK'): continue
                clean=sym[:-3]
                exchange='NSE' if sym.endswith('.NS') else 'BSE'
                key=(clean,exchange)
                if key in seen: continue
                seen.add(key)
                out.append({'symbol':clean,'ticker':sym,'name':x.get('longname') or x.get('shortname') or clean,'exchange':exchange})
            # Prefer NSE, then closest symbol/name matches.
            uq=q.upper().replace(' ','')
            def rank(x):
                symbol=x['symbol'].upper(); name=x['name'].upper().replace(' ','')
                exact=0 if symbol==uq else 1
                starts=0 if symbol.startswith(uq) or name.startswith(uq) else 1
                return (exact,starts,0 if x['exchange']=='NSE' else 1,len(x['name']))
            out.sort(key=rank)
            return self._json(200,{'query':q,'source':'Yahoo Finance live search','results':out[:60]})
        except Exception as e:
            return self._json(502,{'error':'Yahoo search failed: '+str(e),'results':[]})
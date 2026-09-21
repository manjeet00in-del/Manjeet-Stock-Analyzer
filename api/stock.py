import json
import re
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import yfinance as yf


class handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "s-maxage=900, stale-while-revalidate=3600")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            qs = parse_qs(urlparse(self.path).query)
            raw = (qs.get("symbol", [""])[0] or "").upper().strip()
            symbol = re.sub(r"[^A-Z0-9&.-]", "", raw)
            if not symbol:
                return self._json(400, {"error": "Symbol required"})

            # Plain Indian symbols default to NSE. Explicit .BO/.NS are preserved.
            ticker_symbol = symbol if symbol.endswith((".NS", ".BO")) else f"{symbol}.NS"
            ticker = yf.Ticker(ticker_symbol)
            hist = ticker.history(period="2y", interval="1d", auto_adjust=False, actions=False)

            if hist is None or hist.empty:
                return self._json(502, {"error": f"Yahoo Finance data नहीं मिली: {ticker_symbol}"})

            rows = []
            for idx, row in hist.iterrows():
                try:
                    values = {
                        "date": idx.strftime("%Y-%m-%d"),
                        "open": float(row["Open"]),
                        "high": float(row["High"]),
                        "low": float(row["Low"]),
                        "close": float(row["Close"]),
                        "volume": float(row.get("Volume", 0) or 0),
                    }
                    if all(v == v for v in [values["open"], values["high"], values["low"], values["close"]]):
                        rows.append(values)
                except Exception:
                    continue

            if len(rows) < 100:
                return self._json(502, {"error": "पर्याप्त historical data नहीं मिली.", "received": len(rows)})

            quote = None
            try:
                fi = ticker.fast_info
                quote = {
                    "lastPrice": float(fi.get("last_price")) if fi.get("last_price") is not None else rows[-1]["close"],
                    "previousClose": float(fi.get("previous_close")) if fi.get("previous_close") is not None else None,
                    "currency": fi.get("currency") or "INR",
                    "exchange": fi.get("exchange") or "NSE",
                }
            except Exception:
                quote = {"lastPrice": rows[-1]["close"], "currency": "INR", "exchange": "NSE"}

            return self._json(200, {
                "symbol": symbol,
                "ticker": ticker_symbol,
                "source": "Yahoo Finance via yfinance",
                "quote": quote,
                "rows": rows,
            })
        except Exception as e:
            return self._json(502, {"error": f"Yahoo Finance fetch failed: {str(e)}"})

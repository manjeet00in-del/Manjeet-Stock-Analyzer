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
        self.send_header("Cache-Control", "s-maxage=60, stale-while-revalidate=180")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            qs = parse_qs(urlparse(self.path).query)
            raw = (qs.get("symbol", [""])[0] or "").upper().strip()
            symbol = re.sub(r"[^A-Z0-9&.-]", "", raw)
            timeframe = (qs.get("timeframe", ["daily"])[0] or "daily").lower()
            if not symbol:
                return self._json(400, {"error": "Symbol required"})

            ticker_symbol = symbol if symbol.endswith((".NS", ".BO")) else f"{symbol}.NS"
            ticker = yf.Ticker(ticker_symbol)

            configs = {
                "1m": ("7d", "1m"),
                "5m": ("1mo", "5m"),
                "15m": ("1mo", "15m"),
                "30m": ("1mo", "30m"),
                "60m": ("3mo", "60m"),
                "daily": ("2y", "1d"),
            }
            period, interval = configs.get(timeframe, configs["daily"])
            hist = ticker.history(period=period, interval=interval, auto_adjust=False, actions=False)

            if hist is None or hist.empty:
                return self._json(502, {"error": f"Yahoo Finance data नहीं मिली: {ticker_symbol}"})

            rows = []
            for idx, row in hist.iterrows():
                try:
                    vals = {
                        "date": idx.strftime("%Y-%m-%d %H:%M") if interval != "1d" else idx.strftime("%Y-%m-%d"),
                        "open": float(row["Open"]), "high": float(row["High"]),
                        "low": float(row["Low"]), "close": float(row["Close"]),
                        "volume": float(row.get("Volume", 0) or 0),
                    }
                    if all(v == v for v in [vals["open"], vals["high"], vals["low"], vals["close"]]):
                        rows.append(vals)
                except Exception:
                    continue

            if len(rows) < 30:
                return self._json(502, {"error": "पर्याप्त market data नहीं मिली.", "received": len(rows)})

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
                "symbol": symbol, "ticker": ticker_symbol,
                "source": "Yahoo Finance via yfinance",
                "timeframe": timeframe, "interval": interval,
                "quote": quote, "rows": rows,
            })
        except Exception as e:
            return self._json(502, {"error": f"Yahoo Finance fetch failed: {str(e)}"})

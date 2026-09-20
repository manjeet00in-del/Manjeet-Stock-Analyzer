import { NSE } from "nse-bse-api";

export function client() {
  // Explicitly disable server mode on Vercel. In nse-bse-api, `server:true`
  // expects the first constructor argument to be an HTTP server/base URL;
  // our first argument is only a writable download directory.
  return new NSE("/tmp/nse", { server: false, timeout: 15000 });
}

export function val(o, ks) {
  for (const k of ks) {
    if (o?.[k] !== undefined && o?.[k] !== null && o?.[k] !== "") return o[k];
  }
}

export function num(x) {
  return typeof x === "number" ? x : Number(String(x ?? "").replace(/,/g, ""));
}

export function norm(o) {
  const raw = val(o, ["CH_TIMESTAMP", "mTIMESTAMP", "TIMESTAMP", "timestamp", "date", "Date", "tradeDate"]);
  const d = raw ? new Date(raw) : null;
  return {
    date: d && !isNaN(d) ? d.toISOString().slice(0, 10) : String(raw || ""),
    open: num(val(o, ["CH_OPENING_PRICE", "mOPEN", "OPEN", "open", "Open"])),
    high: num(val(o, ["CH_TRADE_HIGH_PRICE", "mHIGH", "HIGH", "high", "High"])),
    low: num(val(o, ["CH_TRADE_LOW_PRICE", "mLOW", "LOW", "low", "Low"])),
    close: num(val(o, ["CH_CLOSING_PRICE", "mCLOSE", "CLOSE", "close", "Close", "lastPrice"])),
    volume: num(val(o, ["CH_TOT_TRADED_QTY", "mTOT_TRADED_QTY", "TOTTRDQTY", "volume", "Volume"])) || 0
  };
}

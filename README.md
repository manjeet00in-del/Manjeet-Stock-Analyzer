# Manjeet Stock Analyzer V6
Stock dashboard with serverless API functions and no user API key. Option-chain and IPO functions use NSE endpoints directly; other functions may use `nse-bse-api` or Yahoo data.

Includes stock lookup, weekly/monthly technical analysis, historical directional backtest, market status, option chain and current IPO tabs.

Deploy the whole repository to Vercel. GitHub Pages alone cannot run the `/api` functions.

NSE may block requests from cloud/serverless IPs or change endpoint formats. The option-chain and IPO handlers use bounded requests and report upstream failures rather than treating them as current market data. A live Vercel deployment check remains necessary before release. The package is a third-party NSE/BSE wrapper, not an official exchange SDK.

## Source-code cross-check (V6.1)
Checked against the uploaded `nse-bse-api` v0.1.3 source.

Corrections applied:
- Use root import `import { NSE } from "nse-bse-api"` because the actual `nse-bse-api/nse` subpath exports `NSEClient`, not an `NSE` alias.
- Symbol lookup now handles `symbols`, `items`, `data`, and `searchdata`, matching the package's own network tests.
- Market-status response parsing improved.
- Confirmed methods: `equityQuote`, `market.lookup`, `market.getStatus`, `historical.fetchEquityHistoricalData`, `options.getOptionChain`, and `ipo.listCurrentIPO`.

## NSE handler checks
Run `node tests/nse-handlers.test.mjs` to check cookie parsing, blocked/non-JSON responses, option-chain expiry validation, and IPO fallback. Also test `/api/options?symbol=NIFTY`, a valid equity, an invalid expiry, and `/api/ipo` on the deployed Vercel URL. A 502/504 response means live data is unavailable; it is not a last-known quote.

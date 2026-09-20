# Manjeet Stock Analyzer V6
NSE dashboard using `nse-bse-api` with no user API key.

Includes stock lookup, weekly/monthly technical analysis, historical directional backtest, market status, option chain and current IPO tabs.

Deploy the whole repository to Vercel. GitHub Pages alone cannot run the `/api` functions.

The package is a third-party NSE/BSE wrapper, not an official exchange SDK. Exchange endpoint changes can break functions.

## Source-code cross-check (V6.1)
Checked against the uploaded `nse-bse-api` v0.1.3 source.

Corrections applied:
- Use root import `import { NSE } from "nse-bse-api"` because the actual `nse-bse-api/nse` subpath exports `NSEClient`, not an `NSE` alias.
- Symbol lookup now handles `symbols`, `items`, `data`, and `searchdata`, matching the package's own network tests.
- Market-status response parsing improved.
- Confirmed methods: `equityQuote`, `market.lookup`, `market.getStatus`, `historical.fetchEquityHistoricalData`, `options.getOptionChain`, and `ipo.listCurrentIPO`.

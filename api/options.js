import {nseJSON,deadline,NSEError,sendError} from './_nse.js';
const INDICES=new Set(['NIFTY','BANKNIFTY','FINNIFTY','MIDCPNIFTY','NIFTYNXT50']);
const ALIASES={NIFTY50:'NIFTY',NIFTYBANK:'BANKNIFTY',NIFTYNEXT50:'NIFTYNXT50'};
function one(value){return Array.isArray(value)?value[0]:value}
export default async function handler(req,res){
  try{
    let symbol=String(one(req.query?.symbol)||'NIFTY').trim().toUpperCase().replace(/\.NS$/,'').replace(/\s+/g,'');
    symbol=ALIASES[symbol]||symbol;
    if(!/^[A-Z0-9&._-]{1,40}$/.test(symbol))throw new NSEError('INVALID_SYMBOL','Enter a valid NSE symbol',400);
    const route=INDICES.has(symbol)?'/api/option-chain-indices?symbol=':'/api/option-chain-equities?symbol=';
    const raw=await nseJSON(route+encodeURIComponent(symbol),'/option-chain',deadline());
    const records=raw?.records;
    if(!records||!Array.isArray(records.data)||!Array.isArray(records.expiryDates))throw new NSEError('BAD_SCHEMA','NSE option-chain format changed');
    if(!records.data.length)throw new NSEError('NO_DATA','No live option-chain rows for '+symbol,404);
    const expiryDates=records.expiryDates;
    const expiry=String(one(req.query?.expiry)||expiryDates[0]||'');
    if(expiry&&!expiryDates.includes(expiry))throw new NSEError('INVALID_EXPIRY','Expiry unavailable; select a current expiry',400);
    const rows=expiry?records.data.filter(x=>x?.expiryDate===expiry):records.data;
    if(!rows.length)throw new NSEError('NO_DATA','No option-chain rows for selected expiry',502);
    const fields=['lastPrice','change','pChange','openInterest','changeinOpenInterest','pchangeinOpenInterest','totalTradedVolume','impliedVolatility','bidprice','askPrice'];
    const side=x=>x&&typeof x==='object'?Object.fromEntries(fields.map(k=>[k,x[k]])):null;
    const chain=rows.filter(x=>x&&typeof x==='object').map(x=>({strikePrice:x.strikePrice,expiryDate:x.expiryDate,CE:side(x.CE),PE:side(x.PE)}));
    if(!chain.length)throw new NSEError('BAD_SCHEMA','NSE option-chain rows are invalid');
    const ceOI=chain.reduce((n,x)=>n+(Number(x.CE?.openInterest)||0),0),peOI=chain.reduce((n,x)=>n+(Number(x.PE?.openInterest)||0),0);
    res.setHeader('Cache-Control','s-maxage=20, stale-while-revalidate=40');
    res.status(200).json({source:'NSE India',symbol,underlyingValue:records.underlyingValue??raw?.filtered?.underlyingValue??null,expiryDates,selectedExpiry:expiry,pcr:ceOI?peOI/ceOI:null,updatedAt:new Date().toISOString(),chain,data:chain});
  }catch(error){sendError(res,error,'Live option chain unavailable')}
}

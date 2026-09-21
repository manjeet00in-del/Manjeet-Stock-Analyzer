const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BASE='https://www.nseindia.com';
const headers={
  'user-agent':UA,
  'accept':'application/json,text/plain,*/*',
  'accept-language':'en-US,en;q=0.9,hi;q=0.8',
  'accept-encoding':'gzip, deflate, br',
  'connection':'keep-alive',
  'referer':BASE+'/option-chain'
};
function cookiesFrom(res){
  try{if(typeof res.headers.getSetCookie==='function')return res.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')}catch{}
  const s=res.headers.get('set-cookie')||'';
  return s.split(/,(?=\s*[^;,=]+=[^;,]+)/).map(x=>x.trim().split(';')[0]).filter(Boolean).join('; ');
}
async function getText(url,h){let r=await fetch(url,{headers:h,redirect:'follow',cache:'no-store'}),t=await r.text();return {r,t}}
async function nseJSON(path){
  let seed=await getText(BASE+'/option-chain',headers),cookie=cookiesFrom(seed.r);
  if(!cookie){let seed2=await getText(BASE+'/',headers);cookie=cookiesFrom(seed2.r)}
  let {r,t}=await getText(BASE+path,{...headers,'cookie':cookie});
  if(r.status===401||r.status===403||!t.trim().startsWith('{')){
    let seed3=await getText(BASE+'/option-chain',headers),c2=cookiesFrom(seed3.r);
    if(c2)cookie=c2;
    ({r,t}=await getText(BASE+path,{...headers,'cookie':cookie}));
  }
  if(!r.ok)throw Error('NSE option-chain HTTP '+r.status);
  try{return JSON.parse(t)}catch{throw Error('NSE option-chain returned non-JSON response')}
}
export default async function handler(req,res){
  try{
    let s=String(req.query.symbol||'NIFTY').trim().toUpperCase().replace(/\.NS$/,'').replace(/\s+/g,'');
    const aliases={'NIFTY50':'NIFTY','NIFTYBANK':'BANKNIFTY','BANKNIFTY':'BANKNIFTY','NIFTY':'NIFTY','FINNIFTY':'FINNIFTY','MIDCPNIFTY':'MIDCPNIFTY','NIFTYNEXT50':'NIFTYNXT50'};
    s=aliases[s]||s;
    let index=['NIFTY','BANKNIFTY','FINNIFTY','MIDCPNIFTY','NIFTYNXT50'].includes(s);
    let path=(index?'/api/option-chain-indices?symbol=':'/api/option-chain-equities?symbol=')+encodeURIComponent(s);
    let raw=await nseJSON(path),r=raw?.records||{},all=Array.isArray(r.data)?r.data:[],expiryDates=Array.isArray(r.expiryDates)?r.expiryDates:[];
    if(!all.length)throw Error('No live option-chain rows returned for '+s);
    let expiry=String(req.query.expiry||expiryDates[0]||''),rows=expiry?all.filter(x=>x.expiryDate===expiry):all;
    let chain=rows.map(x=>({strikePrice:x.strikePrice,expiryDate:x.expiryDate,CE:x.CE?{lastPrice:x.CE.lastPrice,change:x.CE.change,pChange:x.CE.pChange,openInterest:x.CE.openInterest,changeinOpenInterest:x.CE.changeinOpenInterest,pchangeinOpenInterest:x.CE.pchangeinOpenInterest,totalTradedVolume:x.CE.totalTradedVolume,impliedVolatility:x.CE.impliedVolatility,bidprice:x.CE.bidprice,askPrice:x.CE.askPrice}:null,PE:x.PE?{lastPrice:x.PE.lastPrice,change:x.PE.change,pChange:x.PE.pChange,openInterest:x.PE.openInterest,changeinOpenInterest:x.PE.changeinOpenInterest,pchangeinOpenInterest:x.PE.pchangeinOpenInterest,totalTradedVolume:x.PE.totalTradedVolume,impliedVolatility:x.PE.impliedVolatility,bidprice:x.PE.bidprice,askPrice:x.PE.askPrice}:null}));
    let ceOI=chain.reduce((a,x)=>a+(Number(x.CE?.openInterest)||0),0),peOI=chain.reduce((a,x)=>a+(Number(x.PE?.openInterest)||0),0);
    res.setHeader('Cache-Control','s-maxage=20, stale-while-revalidate=40');
    res.status(200).json({source:'NSE India',symbol:s,underlyingValue:r.underlyingValue??raw?.filtered?.underlyingValue??null,expiryDates,selectedExpiry:expiry,pcr:ceOI?peOI/ceOI:null,updatedAt:new Date().toISOString(),chain,data:chain});
  }catch(e){res.status(502).json({error:e?.message||'Live option chain unavailable',source:'NSE India',hint:'NSE may temporarily block cloud/serverless requests; retry after deployment.'})}
}
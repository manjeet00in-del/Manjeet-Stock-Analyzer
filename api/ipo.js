import {nseJSON,deadline,NSEError,sendError} from './_nse.js';
function extract(raw){
  if(Array.isArray(raw))return raw;
  if(!raw||typeof raw!=='object')throw new NSEError('BAD_SCHEMA','NSE IPO format changed');
  for(const key of ['data','ipoList','records','currentIssue','issues']){
    if(Array.isArray(raw[key]))return raw[key];
  }
  const arrays=Object.values(raw).filter(Array.isArray);
  if(arrays.length)return arrays.flat();
  throw new NSEError('BAD_SCHEMA','NSE IPO format changed');
}
function norm(x){return{companyName:x.companyName||x.company||x.name||x.issuerCompany||x.issueName||x.company_name||x.symbol,issueStartDate:x.issueStartDate||x.openDate||x.issueOpenDate||x.startDate||x.issue_start_date,issueEndDate:x.issueEndDate||x.closeDate||x.issueCloseDate||x.endDate||x.issue_end_date,priceBand:x.priceBand||x.priceRange||x.issuePrice||x.price||x.priceBandText,issueSize:x.issueSize||x.issueSizeInCrores||x.size||x.issue_size,lotSize:x.lotSize||x.marketLot||x.minOrderQuantity||x.lot_size,status:x.status||x.issueStatus||x.stage||x.issue_status,listingDate:x.listingDate||x.expectedListingDate||x.listing_date,symbol:x.symbol||x.tradingSymbol||x.ticker,category:x.category||x.issueType||x.type}}
export default async function handler(req,res){
  try{
    const until=deadline(),paths=['/api/ipo-current-issue','/api/all-upcoming-issues?category=ipo'];
    let lastError,validEmpty=false;
    for(const path of paths){
      try{
        const raw=await nseJSON(path,'/market-data/all-upcoming-issues-ipo',until);
        const rows=extract(raw);
        if(!rows.length){validEmpty=true;lastError=null;continue}
        const data=rows.filter(x=>x&&typeof x==='object').map(norm).filter(x=>x.companyName);
        if(!data.length)throw new NSEError('BAD_SCHEMA','NSE IPO entries are unrecognized');
        res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=1200');
        return res.status(200).json({source:'NSE India',updatedAt:new Date().toISOString(),count:data.length,data});
      }catch(e){lastError=e;if(e.code==='TIMEOUT')break}
    }
    if(validEmpty&&!lastError){res.setHeader('Cache-Control','s-maxage=300');return res.status(200).json({source:'NSE India',updatedAt:new Date().toISOString(),count:0,data:[]})}
    throw lastError||new NSEError('UNAVAILABLE','Live IPO data unavailable');
  }catch(error){sendError(res,error,'Live IPO data unavailable')}
}

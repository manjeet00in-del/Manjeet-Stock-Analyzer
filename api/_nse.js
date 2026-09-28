const BASE='https://www.nseindia.com';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export class NSEError extends Error {
  constructor(code,message,status=502){super(message);this.code=code;this.status=status}
}
export function cookiesFrom(response){
  let lines=[];
  try{lines=response.headers.getSetCookie?.()||[]}catch{}
  if(!lines.length){
    const combined=response.headers.get('set-cookie')||'';
    // A comma in Expires is not a cookie boundary; a comma before name= is.
    lines=combined.split(/,(?=\s*[^\s;,=]+\s*=)/);
  }
  return lines.map(line=>line.trim().split(';',1)[0]).filter(x=>/^[^\s;,=]+=/.test(x)).join('; ');
}
export function deadline(ms=25000){return Date.now()+ms}
async function request(path,cookie,referer,until){
  const remaining=until-Date.now();
  if(remaining<=0)throw new NSEError('TIMEOUT','NSE request timed out',504);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.min(6500,remaining));
  try{
    const headers={'user-agent':UA,'accept':'application/json,text/plain,*/*','accept-language':'en-US,en;q=0.9','referer':BASE+referer};
    if(cookie)headers.cookie=cookie;
    const response=await fetch(BASE+path,{headers,redirect:'follow',cache:'no-store',signal:controller.signal});
    const body=await response.text();
    return {response,body};
  }catch(e){
    if(e?.name==='AbortError')throw new NSEError('TIMEOUT','NSE request timed out',504);
    throw new NSEError('NETWORK','NSE connection failed');
  }finally{clearTimeout(timer)}
}
async function seed(referer,until){
  for(const path of [referer,'/']){
    try{const {response}=await request(path,'',referer,until);const cookie=cookiesFrom(response);if(cookie)return cookie}
    catch(e){if(e.code==='TIMEOUT')throw e}
  }
  return '';
}
export async function nseJSON(path,referer,until){
  let cookie=await seed(referer,until);
  for(let attempt=0;attempt<2;attempt++){
    let result;
    try{result=await request(path,cookie,referer,until)}
    catch(e){
      if(attempt===0&&e.code==='NETWORK'){cookie=(await seed(referer,until))||cookie;continue}
      throw e;
    }
    const {response,body}=result;
    let parsed;
    try{parsed=JSON.parse(body)}catch{}
    const blocked=[401,403,429].includes(response.status);
    const transient=blocked||response.status>=500||!parsed||typeof parsed!=='object';
    if(attempt===0&&transient){cookie=(await seed(referer,until))||cookie;continue}
    if(!response.ok)throw new NSEError(blocked?'BLOCKED':'UPSTREAM','NSE HTTP '+response.status,response.status===429?503:502);
    if(!parsed||typeof parsed!=='object')throw new NSEError('NON_JSON','NSE returned non-JSON data');
    return parsed;
  }
}
export function sendError(res,error,label){
  const code=error instanceof NSEError?error.code:'UNAVAILABLE';
  const status=error instanceof NSEError?error.status:502;
  const hint=code==='BLOCKED'?'NSE may block requests from this deployment; try again later.':undefined;
  res.setHeader('Cache-Control','no-store');
  res.status(status).json({error:error?.message||label,code,source:'NSE India',...(hint?{hint}:{})});
}

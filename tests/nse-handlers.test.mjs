import assert from 'node:assert/strict';
import options from './api/options.js';
import ipo from './api/ipo.js';
import {cookiesFrom} from './api/_nse.js';
function response(body,status=200,cookies=[]){return {ok:status>=200&&status<300,status,headers:{getSetCookie:()=>cookies,get:()=>null},text:async()=>typeof body==='string'?body:JSON.stringify(body)}}
function run(handler,query,fetcher){globalThis.fetch=fetcher;let out={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(x){this.body=x;return this}};return handler({query},out).then(()=>out)}
const valid={records:{expiryDates:['30-Sep-2026'],data:[{expiryDate:'30-Sep-2026',strikePrice:25000,CE:{openInterest:10},PE:{openInterest:20}}]}};
let calls=0;
let fetcher=async url=>{calls++;return url.includes('/api/')?response(valid):response('',200,['a=one; Path=/','b=two; Path=/'])};
let r=await run(options,{symbol:'NIFTY 50'},fetcher);
assert.equal(r.statusCode,200);assert.equal(r.body.symbol,'NIFTY');assert.equal(r.body.pcr,2);
r=await run(options,{expiry:'bad'},fetcher);assert.equal(r.statusCode,400);assert.equal(r.body.code,'INVALID_EXPIRY');
r=await run(options,{},async url=>url.includes('/api/')?response({records:{expiryDates:[],data:[]}}):response('',200,['a=1']));
assert.equal(r.statusCode,404);
let apiCalls=0;
r=await run(options,{},async url=>{if(url.includes('/api/')){apiCalls++;return response('<html>blocked</html>',403)}return response('',200,['a=1'])});
assert.equal(r.statusCode,502);assert.equal(r.body.code,'BLOCKED');assert.equal(apiCalls,2);
r=await run(options,{},async url=>url.includes('/api/')?response('<html>blocked</html>'):response('',200,['a=1']));
assert.equal(r.body.code,'NON_JSON');
let pathCalls=[];
r=await run(ipo,{},async url=>{pathCalls.push(url);if(url.includes('ipo-current-issue'))return response({});if(url.includes('all-upcoming-issues?'))return response([{companyName:'Example IPO'}]);return response('',200,['a=1'])});
assert.equal(r.statusCode,200);assert.equal(r.body.count,1);assert.ok(pathCalls.some(x=>x.includes('all-upcoming-issues?')));
r=await run(ipo,{},async url=>url.includes('/api/')?response([]):response('',200,['a=1']));
assert.equal(r.statusCode,200);assert.equal(r.body.count,0);
r=await run(ipo,{},async url=>url.includes('ipo-current-issue')?response([]):url.includes('all-upcoming-issues?')?response('<html>blocked</html>',403):response('',200,['a=1']));
assert.equal(r.statusCode,502);assert.equal(r.body.code,'BLOCKED');
assert.equal(cookiesFrom({headers:{getSetCookie:()=>[],get:()=> 'a=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT, b=2; Path=/'}}),'a=1; b=2');
console.log('Handler fixtures passed');

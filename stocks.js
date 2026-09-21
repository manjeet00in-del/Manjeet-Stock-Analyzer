// NSE quick stock selector for Manjeet Stock Analyzer V7
const MANJEET_STOCKS = [
  ['RELIANCE','Reliance Industries'],['TCS','Tata Consultancy Services'],['INFY','Infosys'],['HDFCBANK','HDFC Bank'],['ICICIBANK','ICICI Bank'],['SBIN','State Bank of India'],['ITC','ITC'],['TATAMOTORS','Tata Motors'],['BHARTIARTL','Bharti Airtel'],['LT','Larsen & Toubro'],['AXISBANK','Axis Bank'],['KOTAKBANK','Kotak Mahindra Bank'],['HINDUNILVR','Hindustan Unilever'],['MARUTI','Maruti Suzuki'],['SUNPHARMA','Sun Pharma'],['BAJFINANCE','Bajaj Finance'],['ASIANPAINT','Asian Paints'],['TITAN','Titan'],['NTPC','NTPC'],['POWERGRID','Power Grid'],['ONGC','ONGC'],['COALINDIA','Coal India'],['WIPRO','Wipro'],['HCLTECH','HCL Technologies'],['TECHM','Tech Mahindra'],['ADANIENT','Adani Enterprises'],['ADANIPORTS','Adani Ports'],['ULTRACEMCO','UltraTech Cement'],['JSWSTEEL','JSW Steel'],['TATASTEEL','Tata Steel'],['M&M','Mahindra & Mahindra'],['EICHERMOT','Eicher Motors'],['BAJAJ-AUTO','Bajaj Auto'],['HEROMOTOCO','Hero MotoCorp'],['DRREDDY','Dr Reddy’s'],['CIPLA','Cipla'],['DIVISLAB','Divi’s Laboratories'],['APOLLOHOSP','Apollo Hospitals'],['NESTLEIND','Nestle India'],['BRITANNIA','Britannia'],['GRASIM','Grasim'],['HINDALCO','Hindalco'],['INDUSINDBK','IndusInd Bank'],['SBILIFE','SBI Life'],['HDFCLIFE','HDFC Life'],['BPCL','BPCL'],['TATACONSUM','Tata Consumer'],['TRENT','Trent'],['BEL','Bharat Electronics'],['SHRIRAMFIN','Shriram Finance']
];

function installStockPicker(prefix) {
  const input = document.getElementById(prefix + 'sym');
  if (!input || input.dataset.pickerReady) return;
  input.dataset.pickerReady = '1';
  const listId = prefix + 'StockList';
  const dl = document.createElement('datalist');
  dl.id = listId;
  dl.innerHTML = MANJEET_STOCKS.map(([s,n]) => `<option value="${s}">${n}</option>`).join('');
  document.body.appendChild(dl);
  input.setAttribute('list', listId);
  input.placeholder = 'Type/share select करें';

  const wrap = input.closest('.f');
  const quick = document.createElement('div');
  quick.style.cssText = 'display:flex;gap:6px;overflow-x:auto;margin-top:8px;padding-bottom:2px';
  quick.innerHTML = MANJEET_STOCKS.slice(0,10).map(([s]) => `<button type="button" data-symbol="${s}" style="width:auto;min-width:max-content;padding:7px 9px;font-size:11px;background:#132944;border:1px solid #20354e">${s}</button>`).join('');
  quick.onclick = e => {
    const b = e.target.closest('[data-symbol]');
    if (b) input.value = b.dataset.symbol;
  };
  wrap.appendChild(quick);
}

function initStockPickers(){ installStockPicker('s'); installStockPicker('i'); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(initStockPickers, 0));
else setTimeout(initStockPickers, 0);

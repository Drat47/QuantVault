import React, { useState, useEffect } from "react";

export default function CurrencyConverter({ currencyConfigs }) {
  const [amount, setAmount] = useState("100");
  const [fromCur, setFromCur] = useState("USD");
  const [toCur, setToCur] = useState("INR");
  const [result, setResult] = useState(0);

  // Perform calculation locally when inputs change
  useEffect(() => {
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0 || !currencyConfigs[fromCur] || !currencyConfigs[toCur]) {
      setResult(0);
      return;
    }

    // Convert from source currency to INR base, then from INR base to target currency
    const amountInBase = amt * currencyConfigs[fromCur].rateToINR;
    const finalAmount = amountInBase / currencyConfigs[toCur].rateToINR;
    setResult(finalAmount);
  }, [amount, fromCur, toCur, currencyConfigs]);

  function handleSwap() {
    const temp = fromCur;
    setFromCur(toCur);
    setToCur(temp);
  }

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
      <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-slate-400 flex items-center space-x-2">
        <svg className="w-4.5 h-4.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <span>Quick Exchange Converter</span>
      </h3>

      <div className="space-y-4 flex-1 flex flex-col justify-between mt-1">
        <div className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5" htmlFor="conv-amt">Amount</label>
            <input
              id="conv-amt"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition duration-200 text-sm font-mono"
              placeholder="Enter amount..."
              min="0"
            />
          </div>

          {/* Currency selection row with swap button */}
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">From</label>
              <select
                value={fromCur}
                onChange={(e) => setFromCur(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm cursor-pointer"
              >
                {Object.keys(currencyConfigs).map((cur) => (
                  <option key={cur} value={cur} className="bg-slate-950">
                    {cur} ({currencyConfigs[cur].symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-5">
              <button
                onClick={handleSwap}
                type="button"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 active:scale-95 transition cursor-pointer"
                title="Swap currencies"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            <div className="flex-1">
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">To</label>
              <select
                value={toCur}
                onChange={(e) => setToCur(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-sm cursor-pointer"
              >
                {Object.keys(currencyConfigs).map((cur) => (
                  <option key={cur} value={cur} className="bg-slate-950">
                    {cur} ({currencyConfigs[cur].symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic converted output */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 text-center animate-fade-in mt-4">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Converted Value</span>
          <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400 tracking-tight mt-1 font-mono">
            {currencyConfigs[toCur]?.symbol}{" "}
            {result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-slate-600 text-[9px] mt-0.5 block">
            1 {fromCur} = {((1 * currencyConfigs[fromCur].rateToINR) / currencyConfigs[toCur].rateToINR).toFixed(4)} {toCur}
          </span>
        </div>
      </div>
    </div>
  );
}

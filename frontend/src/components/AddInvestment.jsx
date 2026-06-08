import React, { useState, useEffect } from "react";
import { fetchLiveAssetPrice } from "../utils/priceService";

export default function AddInvestment({ onAdd, activeCurrencyConfig, activeCurrency, currencyConfigs }) {
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customPrice, setCustomPrice] = useState("");
  const [useLivePrice, setUseLivePrice] = useState(true);
  const [livePrice, setLivePrice] = useState(0);
  const [timestamp, setTimestamp] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const query = ticker.trim() || name.trim();
    if (!query) {
      setLivePrice(0);
      setTimestamp("");
      return;
    }

    let isMounted = true;
    const fetchPrice = async () => {
      try {
        const res = await fetchLiveAssetPrice(query, activeCurrency || "INR", currencyConfigs || {});
        if (isMounted) {
          setLivePrice(res.price);
          setTimestamp(res.timestamp);
        }
      } catch (err) {
        console.error("Error fetching live price:", err);
      }
    };

    fetchPrice();
    // Refresh price every 5 seconds
    const interval = setInterval(fetchPrice, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [name, ticker, activeCurrency, currencyConfigs]);

  const currentUnitPrice = useLivePrice ? livePrice : Number(customPrice) || 0;
  const totalValuation = (Number(quantity) || 0) * currentUnitPrice;

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Asset name is required");
      return;
    }
    if (Number(quantity) <= 0) {
      setError("Quantity must be a positive number");
      return;
    }
    if (currentUnitPrice <= 0) {
      setError("Price per unit must be greater than zero");
      return;
    }

    // Pass the calculated total valuation (amount), quantity, ticker, and is_live fields
    onAdd({
      name: name.trim(),
      ticker: (ticker.trim() || name.trim()).toUpperCase(),
      quantity: Number(quantity),
      amount: totalValuation, // amount in active display currency
      is_live: useLivePrice
    });

    setName("");
    setTicker("");
    setQuantity("1");
    setCustomPrice("");
    setUseLivePrice(true);
  }

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Add Asset</span>
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2 animate-fade-in">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between mt-1">
        <div className="space-y-3">
          {/* Asset Name & Ticker Symbol */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1" htmlFor="inv-name">Asset Name</label>
              <input
                id="inv-name"
                type="text"
                placeholder="e.g. Apple, Bitcoin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition duration-200 text-sm font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1" htmlFor="inv-ticker">Ticker (Optional)</label>
              <input
                id="inv-ticker"
                type="text"
                placeholder="e.g. AAPL, BTC"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition duration-200 text-sm font-mono uppercase font-bold"
              />
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1" htmlFor="inv-qty">Quantity</label>
            <input
              id="inv-qty"
              type="number"
              step="any"
              placeholder="1.0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition duration-200 text-sm font-mono"
              required
            />
          </div>

          {/* Price selection toggle */}
          <div className="flex items-center space-x-2 py-1">
            <input
              id="live-toggle"
              type="checkbox"
              checked={useLivePrice}
              onChange={(e) => setUseLivePrice(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="live-toggle" className="text-xs text-slate-300 font-semibold cursor-pointer select-none">
              Use Live Market Price Feed
            </label>
          </div>

          {/* Price per unit input */}
          <div>
            <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
              Price per Unit ({activeCurrencyConfig.symbol})
            </label>
            {useLivePrice ? (
              <div className="w-full px-3 py-2 bg-slate-900/40 border border-slate-800/80 rounded-xl text-emerald-400 text-sm font-mono font-bold flex items-center justify-between">
                <span>
                  {activeCurrencyConfig.symbol} {livePrice > 0 ? livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "0.00"}
                </span>
                {timestamp && (
                  <span className="text-[9px] text-slate-500 font-normal">
                    Updated: {timestamp.split(" ")[1]}
                  </span>
                )}
              </div>
            ) : (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <span className="text-sm font-semibold">{activeCurrencyConfig.symbol}</span>
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition duration-200 text-sm font-mono"
                  required={!useLivePrice}
                />
              </div>
            )}
          </div>

          {/* Total Preview */}
          <div className="p-3 bg-slate-950/40 border border-slate-900/60 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Estimated Valuation:</span>
            <span className="text-white font-mono font-bold">
              {activeCurrencyConfig.symbol} {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-950/30 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center space-x-1.5 text-sm mt-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Asset</span>
        </button>
      </form>
    </div>
  );
}

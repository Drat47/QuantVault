import React, { useState, useEffect } from "react";

export default function InvestmentItem({ 
  inv, 
  onDelete, 
  onUpdate, 
  activeCurrencyConfig, 
  livePrice, 
  lastUpdated 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(inv.name);
  const [ticker, setTicker] = useState(inv.ticker || "");
  const [quantity, setQuantity] = useState(inv.quantity || 1);
  const [useLivePrice, setUseLivePrice] = useState(inv.is_live !== false);
  const [customPrice, setCustomPrice] = useState("");

  // Sync state when props change
  useEffect(() => {
    setName(inv.name);
    setTicker(inv.ticker || "");
    setQuantity(inv.quantity || 1);
    setUseLivePrice(inv.is_live !== false);
    
    // If not using live price, we reconstruct the custom unit price in active currency
    if (inv.is_live === false) {
      const unitPriceBase = inv.amount / (inv.quantity || 1);
      setCustomPrice((unitPriceBase / activeCurrencyConfig.rateToINR).toFixed(2));
    }
  }, [inv, activeCurrencyConfig]);

  // Keep track of price movement for visual indicator (flashing green/red)
  const [prevPrice, setPrevPrice] = useState(livePrice);
  const [priceFlash, setPriceFlash] = useState(null); // 'up', 'down', or null

  useEffect(() => {
    if (livePrice === prevPrice) return;
    if (livePrice > prevPrice) {
      setPriceFlash("up");
    } else {
      setPriceFlash("down");
    }
    setPrevPrice(livePrice);
    
    const timer = setTimeout(() => setPriceFlash(null), 1000);
    return () => clearTimeout(timer);
  }, [livePrice]);

  function saveUpdate() {
    if (!name.trim() || Number(quantity) <= 0) return;

    let finalUnitPrice = useLivePrice ? (livePrice * activeCurrencyConfig.rateToINR) : Number(customPrice) * activeCurrencyConfig.rateToINR;
    if (finalUnitPrice <= 0) return;

    const totalValuationBase = Number(quantity) * finalUnitPrice;

    onUpdate(inv.id, { 
      name: name.trim(), 
      ticker: (ticker.trim() || name.trim()).toUpperCase(),
      quantity: Number(quantity),
      amount: totalValuationBase, // Base currency (INR)
      is_live: useLivePrice
    });
    setIsEditing(false);
  }

  // Determine current unit price & total valuation in active display currency
  const currentUnitPrice = useLivePrice ? (livePrice || 0) : (Number(customPrice) || 0);
  const totalValuation = Number(quantity) * currentUnitPrice;

  return (
    <tr className="border-b border-slate-900/60 hover:bg-slate-900/35 transition duration-150">
      {isEditing ? (
        <>
          <td className="py-3 px-4" colSpan={4}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-semibold uppercase">Asset Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:border-emerald-500 w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-semibold uppercase">Ticker</label>
                <input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="e.g. AAPL"
                  className="bg-slate-950 border border-slate-855 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:border-emerald-500 w-full uppercase font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-semibold uppercase">Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="bg-slate-950 border border-slate-860 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:border-emerald-500 w-full font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-semibold uppercase">Price Mode</label>
                <div className="flex items-center space-x-2 py-1">
                  <input
                    id={`live-toggle-${inv.id}`}
                    type="checkbox"
                    checked={useLivePrice}
                    onChange={(e) => setUseLivePrice(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor={`live-toggle-${inv.id}`} className="text-xs text-slate-300 font-medium select-none cursor-pointer">
                    Live Feed
                  </label>
                </div>
              </div>

              {!useLivePrice && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase">
                    Custom Unit Price ({activeCurrencyConfig.symbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:border-emerald-500 w-full font-mono"
                  />
                </div>
              )}

              <div className="md:col-span-4 flex items-center justify-between border-t border-slate-900 pt-3 mt-1">
                <div className="text-xs text-slate-400">
                  Valuation: <span className="text-white font-bold font-mono">{activeCurrencyConfig.symbol} {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={saveUpdate}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setName(inv.name);
                      setTicker(inv.ticker || "");
                      setQuantity(inv.quantity || 1);
                      setUseLivePrice(inv.is_live !== false);
                      setIsEditing(false);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </td>
        </>
      ) : (
        <>
          {/* Column 1: Asset Name & Ticker */}
          <td className="py-4 px-4 text-sm font-semibold text-white">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center text-xs font-mono font-bold text-slate-400 uppercase">
                {inv.ticker ? inv.ticker.slice(0, 3) : inv.name.slice(0, 3)}
              </div>
              <div className="flex flex-col">
                <span className="text-slate-100 font-semibold text-sm leading-tight">{inv.name}</span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 tracking-wider uppercase">
                  {inv.ticker || inv.name}
                </span>
              </div>
            </div>
          </td>

          {/* Column 2: Quantity */}
          <td className="py-4 px-4 text-sm text-slate-300 font-mono">
            {Number(inv.quantity || 1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </td>

          {/* Column 3: Current Unit Price */}
          <td className="py-4 px-4 text-sm font-mono relative">
            <div className="flex items-center space-x-2">
              <span className={`transition-all duration-300 ${
                priceFlash === "up" ? "text-emerald-400 scale-105 font-bold" :
                priceFlash === "down" ? "text-red-400 scale-105 font-bold" :
                useLivePrice ? "text-slate-300" : "text-slate-400"
              }`}>
                {activeCurrencyConfig.symbol}
                {currentUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>

              {/* Status Indicator */}
              {useLivePrice ? (
                <div 
                  className={`w-1.5 h-1.5 rounded-full relative group cursor-help ${
                    priceFlash === "up" ? "bg-emerald-400 animate-ping" :
                    priceFlash === "down" ? "bg-red-400 animate-ping" :
                    "bg-emerald-500/80"
                  }`}
                  title={`Live market feed. Last updated: ${lastUpdated || 'now'}`}
                >
                  <span className="absolute hidden group-hover:block bg-slate-950 text-[9px] text-slate-400 px-2 py-1 rounded border border-slate-800 -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50">
                    Live Feed: {lastUpdated || 'recent'}
                  </span>
                </div>
              ) : (
                <span className="text-[9px] text-slate-500 font-sans border border-slate-850 px-1 py-0.5 rounded leading-none">
                  Manual
                </span>
              )}
            </div>
            {useLivePrice && lastUpdated && (
              <span className="text-[9px] text-slate-600 block mt-0.5 font-sans">
                {lastUpdated.split(" ")[1]}
              </span>
            )}
          </td>

          {/* Column 4: Total Valuation */}
          <td className="py-4 px-4 text-sm font-bold text-white font-mono">
            {activeCurrencyConfig.symbol}
            {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>

          {/* Column 5: Actions */}
          <td className="py-4 px-4 text-right">
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-amber-400 transition cursor-pointer"
                title="Edit asset"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(inv.id)}
                className="text-slate-400 hover:text-red-400 transition cursor-pointer"
                title="Delete asset"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        </>
      )}
    </tr>
  );
}

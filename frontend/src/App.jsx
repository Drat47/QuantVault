import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Signup from "./components/Signup";
import AddInvestment from "./components/AddInvestment";
import InvestmentItem from "./components/InvestmentItem";
import InvestmentChart from "./components/InvestmentChart";
import CurrencyConverter from "./components/CurrencyConverter";
import { fetchInvestments, addInvestment, deleteInvestment, updateInvestment } from "./api";
import { fetchLiveAssetPrice, getFormattedDateTime } from "./utils/priceService";

const CURRENCY_CONFIGS = {
  INR: { symbol: "₹", name: "INR (Indian Rupee)", rateToINR: 1.0 },
  USD: { symbol: "$", name: "USD (US Dollar)", rateToINR: 83.5 },
  EUR: { symbol: "€", name: "EUR (Euro)", rateToINR: 90.2 },
  GBP: { symbol: "£", name: "GBP (British Pound)", rateToINR: 106.1 },
  JPY: { symbol: "¥", name: "JPY (Japanese Yen)", rateToINR: 0.53 },
  AED: { symbol: "د.إ", name: "AED (UAE Dirham)", rateToINR: 22.7 }
};

const TICKER_ITEMS = [
  { name: "BTC", baseUSD: 68420 },
  { name: "ETH", baseUSD: 3620 },
  { name: "AAPL", baseUSD: 182.5 },
  { name: "NVDA", baseUSD: 875.12 },
  { name: "GOLD", baseUSD: 2315.8 },
  { name: "MSFT", baseUSD: 415.6 },
  { name: "TSLA", baseUSD: 175.2 },
  { name: "SOL", baseUSD: 152.4 }
];

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [investments, setInvestments] = useState([]);
  const [prices, setPrices] = useState({}); // { [id]: { price: number, timestamp: string } }
  const [error, setError] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCurrency, setActiveCurrency] = useState("INR");

  const activeCurrencyConfig = CURRENCY_CONFIGS[activeCurrency] || CURRENCY_CONFIGS.INR;

  // Initial investments fetch
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchInvestments(token)
      .then((data) => {
        setInvestments(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Live prices update effect
  useEffect(() => {
    if (investments.length === 0) return;

    let isMounted = true;
    const refreshAllPrices = async () => {
      const updatedPrices = { ...prices };
      let changed = false;

      for (const inv of investments) {
        if (inv.is_live === false) {
          // Manual price fallback: compute unit price in active currency
          const qty = inv.quantity || 1.0;
          const unitPriceBase = inv.amount / qty;
          const displayPrice = unitPriceBase / activeCurrencyConfig.rateToINR;
          updatedPrices[inv.id] = {
            price: displayPrice,
            timestamp: getFormattedDateTime()
          };
          changed = true;
          continue;
        }

        const tickerOrName = inv.ticker || inv.name;
        try {
          const res = await fetchLiveAssetPrice(tickerOrName, activeCurrency, CURRENCY_CONFIGS);
          updatedPrices[inv.id] = {
            price: res.price,
            timestamp: res.timestamp
          };
          changed = true;
        } catch (e) {
          console.error(`Failed to refresh price for ${tickerOrName}:`, e);
        }
      }

      if (isMounted && changed) {
        setPrices(updatedPrices);
      }
    };

    refreshAllPrices();
    // Fetch live price updates every 8 seconds
    const interval = setInterval(refreshAllPrices, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [investments, activeCurrency]);

  function handleLogin(newToken) {
    console.log("Setting token in app state:", newToken);
    setToken(newToken);
    localStorage.setItem("token", newToken);
    setError(null);
  }

  function handleLogout() {
    setToken("");
    localStorage.removeItem("token");
    setInvestments([]);
    setPrices({});
  }

  async function handleAdd(newInv) {
    try {
      // newInv.amount is already the total valuation in active display currency.
      // Convert it back to base INR before sending to database.
      const amountInBase = newInv.amount * activeCurrencyConfig.rateToINR;
      const added = await addInvestment({ ...newInv, amount: amountInBase }, token);
      setInvestments([...investments, added]);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteInvestment(id, token);
      setInvestments(investments.filter((i) => i.id !== id));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdate(id, updatedInv) {
    try {
      const updated = await updateInvestment(id, updatedInv, token);
      setInvestments(investments.map((i) => (i.id === id ? updated : i)));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  // Pure JavaScript dependency-free CSV Export in active currency with updated columns
  function exportToCSV() {
    if (investments.length === 0) return;
    const headers = ["Asset Name", "Ticker", "Quantity", `Price per Unit (${activeCurrency})`, `Total Valuation (${activeCurrency})` ];
    const rows = investments.map((inv) => {
      const priceInfo = prices[inv.id];
      const unitPrice = priceInfo ? priceInfo.price : (inv.amount / (inv.quantity || 1)) / activeCurrencyConfig.rateToINR;
      const totalVal = (inv.quantity || 1) * unitPrice;
      return [
        inv.name,
        inv.ticker || inv.name,
        (inv.quantity || 1).toFixed(4),
        unitPrice.toFixed(4),
        totalVal.toFixed(2)
      ];
    });
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `QuantVault_Export_${activeCurrency}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredInvestments = investments.filter((inv) =>
    inv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute live portfolio net worth in base INR
  const totalValueInBase = investments.reduce((sum, inv) => {
    const priceInfo = prices[inv.id];
    if (priceInfo) {
      const priceInBase = priceInfo.price * activeCurrencyConfig.rateToINR;
      return sum + (inv.quantity || 1) * priceInBase;
    }
    return sum + (Number(inv.amount) || 0);
  }, 0);

  const assetCount = investments.length;
  
  // Find top asset holding based on live valuations
  const largestAsset = investments.reduce((max, inv) => {
    const priceInfo = prices[inv.id];
    const invValuationBase = priceInfo 
      ? (inv.quantity || 1) * priceInfo.price * activeCurrencyConfig.rateToINR 
      : (Number(inv.amount) || 0);

    const maxValuationBase = max 
      ? (prices[max.id] ? (max.quantity || 1) * prices[max.id].price * activeCurrencyConfig.rateToINR : (Number(max.amount) || 0))
      : 0;

    return !max || invValuationBase > maxValuationBase ? inv : max;
  }, null);

  const largestAssetValuationDisplay = largestAsset 
    ? (prices[largestAsset.id] 
        ? (largestAsset.quantity || 1) * prices[largestAsset.id].price 
        : (largestAsset.amount / activeCurrencyConfig.rateToINR))
    : 0;

  // Compute dynamic investments array to pass to the allocation chart
  const computedInvestments = investments.map((inv) => {
    const priceInfo = prices[inv.id];
    const liveValuationBase = priceInfo 
      ? (inv.quantity || 1) * priceInfo.price * activeCurrencyConfig.rateToINR 
      : inv.amount;
    return {
      ...inv,
      amount: liveValuationBase
    };
  });

  const username = token ? token.split("@")[0] : "";

  // Helper for computing scrolling ticker values dynamically in display currency
  const getTickerDisplayPrice = (baseUSD) => {
    const usdRateToINR = CURRENCY_CONFIGS.USD.rateToINR;
    const priceInINR = baseUSD * usdRateToINR;
    const finalPrice = priceInINR / activeCurrencyConfig.rateToINR;
    return `${activeCurrencyConfig.symbol}${finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Auth Screen Flow
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {showSignup ? (
          <div>
            <Signup onSignupSuccess={() => setShowSignup(false)} />
            <div className="text-center mt-6">
              <button
                onClick={() => setShowSignup(false)}
                className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition cursor-pointer"
              >
                Already have an account? Sign In
              </button>
            </div>
          </div>
        ) : (
          <div>
            <Login onLogin={handleLogin} />
            <div className="text-center mt-6">
              <button
                onClick={() => setShowSignup(true)}
                className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition cursor-pointer"
              >
                Don't have an account? Sign Up
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar Header */}
      <header className="glass-panel border-b border-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight font-display">
              Quant<span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Vault</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Currency Dropdown Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-400 font-semibold hidden md:inline">Currency:</span>
              <select
                value={activeCurrency}
                onChange={(e) => setActiveCurrency(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer animate-fade-in"
              >
                {Object.keys(CURRENCY_CONFIGS).map((cur) => (
                  <option key={cur} value={cur} className="bg-slate-950 text-white">
                    {cur} ({CURRENCY_CONFIGS[cur].symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-white capitalize">{username}</span>
              <span className="text-xs text-slate-500">{token}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold capitalize shadow-sm">
              {username[0]}
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-red-500/20 hover:text-red-400 text-xs font-semibold text-slate-300 rounded-lg transition duration-200 cursor-pointer flex items-center space-x-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between animate-fade-in">
            <div className="flex items-center space-x-2.5">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 cursor-pointer text-xs font-bold">Dismiss</button>
          </div>
        )}

        {/* Live Ticker Marquee Bar */}
        <div className="glass-panel rounded-xl py-2 shadow-sm overflow-hidden text-[11px] flex items-center space-x-4">
          <span className="flex items-center space-x-1.5 shrink-0 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg font-bold uppercase tracking-wider ml-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Market Feed</span>
          </span>
          <div className="flex-1 overflow-hidden relative">
            <div className="animate-marquee-container">
              {/* Repeated twice for continuous loop scrolling */}
              <div className="animate-marquee-content space-x-8">
                {TICKER_ITEMS.map((item, idx) => (
                  <span key={`ticker-1-${idx}`} className="text-slate-300 font-medium">
                    {item.name}: <span className="font-mono text-emerald-400 font-bold">{getTickerDisplayPrice(item.baseUSD)}</span>
                  </span>
                ))}
              </div>
              <div className="animate-marquee-content space-x-8" aria-hidden="true">
                {TICKER_ITEMS.map((item, idx) => (
                  <span key={`ticker-2-${idx}`} className="text-slate-300 font-medium">
                    {item.name}: <span className="font-mono text-emerald-400 font-bold">{getTickerDisplayPrice(item.baseUSD)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Total Portfolio Balance */}
          <div className="glass-panel rounded-2xl p-6 shadow-md relative overflow-hidden flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Net Portfolio Worth</span>
              <h3 className="text-2xl font-bold text-white tracking-tight font-mono">
                {activeCurrencyConfig.symbol}
                {Number(totalValueInBase / activeCurrencyConfig.rateToINR).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-emerald-400 flex items-center space-x-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>Live Valuation ({activeCurrency})</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Card 2: Total Assets */}
          <div className="glass-panel rounded-2xl p-6 shadow-md relative overflow-hidden flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Asset Diversity</span>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {assetCount} {assetCount === 1 ? "Holding" : "Holdings"}
              </h3>
              <p className="text-xs text-slate-500">Distributed allocation</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>

          {/* Card 3: Largest Asset */}
          <div className="glass-panel rounded-2xl p-6 shadow-md relative overflow-hidden flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Top Asset Holding</span>
              <h3 className="text-2xl font-bold text-white tracking-tight truncate max-w-[190px]">
                {largestAsset ? largestAsset.name : "N/A"}
              </h3>
              <p className="text-xs text-amber-400 font-mono">
                {largestAsset ? (
                  <>
                    {activeCurrencyConfig.symbol}
                    {Number(largestAssetValuationDisplay).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </>
                ) : (
                  "No assets added"
                )}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </section>

        {/* Dashboard Panels Layout */}
        <div className="space-y-6">
          {/* Top 3-Column Grid of Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Block 1: Add Investment */}
            <AddInvestment 
              onAdd={handleAdd} 
              activeCurrencyConfig={activeCurrencyConfig} 
              activeCurrency={activeCurrency}
              currencyConfigs={CURRENCY_CONFIGS}
            />

            {/* Block 2: Asset Allocation Graph */}
            <div className="glass-panel rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full">
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <span>Asset Allocation</span>
              </h3>
              <div className="flex-1 flex items-center justify-center min-h-[260px]">
                <InvestmentChart data={computedInvestments} activeCurrencyConfig={activeCurrencyConfig} />
              </div>
            </div>

            {/* Block 3: Quick Currency Converter Widget */}
            <CurrencyConverter currencyConfigs={CURRENCY_CONFIGS} />
          </div>

          {/* Bottom Full-Width Assets Table Container */}
          <div className="glass-panel rounded-2xl shadow-xl overflow-hidden w-full">
            {/* Table Toolbar Header */}
            <div className="p-5 border-b border-slate-900/60 bg-slate-900/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search holdings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition duration-200 text-sm"
                />
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <button
                  onClick={exportToCSV}
                  disabled={investments.length === 0}
                  className="py-2 px-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition duration-150 cursor-pointer flex items-center space-x-1.5 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Assets Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : filteredInvestments.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                  <h4 className="text-sm font-semibold text-slate-300">No assets found</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchTerm ? "Try searching for a different term" : "Add some investments to begin tracking"}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900/60 bg-slate-900/10">
                      <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Asset Name</th>
                      <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Quantity</th>
                      <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Market Price</th>
                      <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Total Valuation</th>
                      <th className="py-3.5 px-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvestments.map((inv) => (
                      <InvestmentItem
                        key={inv.id}
                        inv={inv}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                        activeCurrencyConfig={activeCurrencyConfig}
                        livePrice={prices[inv.id]?.price || (inv.amount / (inv.quantity || 1)) / activeCurrencyConfig.rateToINR}
                        lastUpdated={prices[inv.id]?.timestamp || ""}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 mt-auto text-center text-xs text-slate-600">
        <p>© {new Date().getFullYear()} QuantVault. Professional investment intelligence & portfolio analytics.</p>
      </footer>
    </div>
  );
}

export default App;

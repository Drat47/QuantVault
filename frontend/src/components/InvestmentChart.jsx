import React from "react";
import { PieChart, Pie, Tooltip, Cell, Legend, ResponsiveContainer } from "recharts";

const COLORS = [
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#ef4444"  // Red
];

// Custom Tooltip for premium visual feel
const CustomTooltip = ({ active, payload, activeCurrencyConfig }) => {
  if (active && payload && payload.length && activeCurrencyConfig) {
    const convertedValue = payload[0].value / activeCurrencyConfig.rateToINR;
    return (
      <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-3.5 rounded-xl shadow-xl">
        <p className="text-xs font-semibold text-slate-400 mb-1">{payload[0].name}</p>
        <p className="text-sm font-bold text-white font-mono">
          {activeCurrencyConfig.symbol}
          {Number(convertedValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export default function InvestmentChart({ data, activeCurrencyConfig }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[230px] w-full bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
        <svg className="w-10 h-10 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        <p className="text-sm text-slate-500">No assets to visualize</p>
      </div>
    );
  }

  const chartData = data.map((inv) => ({
    name: inv.name,
    value: inv.amount,
  }));

  return (
    <div className="w-full h-[250px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="47%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
                stroke="#0f172a" 
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip activeCurrencyConfig={activeCurrencyConfig} />} />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle" 
            iconSize={8}
            formatter={(value) => <span className="text-xs font-medium text-slate-400 hover:text-white transition duration-150">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

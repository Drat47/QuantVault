import React from "react";
import { CSVLink } from "react-csv";
import InvestmentItem from "./InvestmentItem";

export default function InvestmentList({ investments, onDelete, onUpdate }) {
  return (
    <div>
      <CSVLink
        data={investments}
        filename={"investments.csv"}
        className="mb-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
      >
        Export to CSV
      </CSVLink>
      <ul className="space-y-4">
        {investments.map((inv) => (
          <InvestmentItem key={inv.id} inv={inv} onDelete={onDelete} onUpdate={onUpdate} />
        ))}
      </ul>
    </div>
  );
}

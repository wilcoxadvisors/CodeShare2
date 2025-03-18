// src/components/dashboard/CashFlowChart.jsx
import React from 'react';
import { Line } from 'react-chartjs-2';

export default function CashFlowChart({ cashFlow }) {
  const chartData = {
    labels: cashFlow.labels,
    datasets: [{
      label: 'Cash Flow',
      data: cashFlow.data,
      borderColor: '#1E3A8A',
      tension: 0.1,
    }],
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">Cash Flow</h3>
      <Line data={chartData} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} />
    </div>
  );
}

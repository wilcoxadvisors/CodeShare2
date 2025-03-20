import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartProps {
  type: 'line' | 'bar';
  data: ChartData<'line' | 'bar'>;
  options?: ChartOptions<'line' | 'bar'>;
  height?: number;
}

export default function Chart({ type, data, options, height }: ChartProps) {
  const defaultOptions: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const chartOptions = options ? { ...defaultOptions, ...options } : defaultOptions;

  return (
    <div style={{ height: height || '100%', width: '100%' }}>
      {type === 'line' ? (
        <Line data={data} options={chartOptions} />
      ) : (
        <Bar data={data} options={chartOptions} />
      )}
    </div>
  );
}
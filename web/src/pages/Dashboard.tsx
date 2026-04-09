import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSummary } from '../api';
import StatsCard from '../components/StatsCard';

interface Summary {
  total_apps: number;
  active_apps: number;
  total_builders: number;
  departments_represented: number;
  apps_registered_this_month: number;
  apps_by_status: Record<string, number>;
  apps_by_tool: Record<string, number>;
  apps_by_department: Record<string, number>;
}

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getSummary().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!data) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Total Apps" value={data.total_apps} />
        <StatsCard label="Active Apps" value={data.active_apps} />
        <StatsCard label="Builders" value={data.total_builders} />
        <StatsCard label="This Month" value={data.apps_registered_this_month} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">By Status</h2>
          <ul className="space-y-2">
            {Object.entries(data.apps_by_status).map(([status, count]) => (
              <li key={status} className="flex justify-between text-sm">
                <span className="capitalize">{status}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">By Tool</h2>
          <ul className="space-y-2">
            {Object.entries(data.apps_by_tool).map(([tool, count]) => (
              <li key={tool} className="flex justify-between text-sm">
                <span>{tool}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">By Department</h2>
          <ul className="space-y-2">
            {Object.entries(data.apps_by_department).map(([dept, count]) => (
              <li key={dept} className="flex justify-between text-sm">
                <span>{dept}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <Link to="/apps" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          View All Apps &rarr;
        </Link>
        <Link to="/leaderboard" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          View Leaderboard &rarr;
        </Link>
        <Link to="/skills" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          Download Skills &rarr;
        </Link>
      </div>
    </div>
  );
}

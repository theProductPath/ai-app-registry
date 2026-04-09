import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStaleness } from '../api';

interface StaleApp {
  id: string;
  app_name: string;
  builder_name: string;
  department: string;
  last_checkin: string;
  days_since_checkin: number;
  status: string;
}

export default function Staleness() {
  const [apps, setApps] = useState<StaleApp[]>([]);
  const [totalStale, setTotalStale] = useState(0);
  const [threshold, setThreshold] = useState('90');
  const [error, setError] = useState('');

  useEffect(() => {
    getStaleness({ stale_days: threshold })
      .then((res) => {
        setApps(res.stale_apps);
        setTotalStale(res.total_stale);
      })
      .catch((e) => setError(e.message));
  }, [threshold]);

  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Staleness Report</h1>
          <p className="text-sm text-gray-500 mt-1">{totalStale} apps haven't checked in</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Threshold:</label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">App Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Builder</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Days Stale</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last Check-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {apps.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/apps/${app.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                    {app.app_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{app.builder_name}</td>
                <td className="px-4 py-3 text-gray-600">{app.department}</td>
                <td className="px-4 py-3">
                  <span className="capitalize">{app.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-semibold ${app.days_since_checkin > 180 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {app.days_since_checkin}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(app.last_checkin).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {apps.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No stale apps found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

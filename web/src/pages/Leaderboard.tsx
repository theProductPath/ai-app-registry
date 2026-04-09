import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeaderboard } from '../api';

interface Entry {
  rank: number;
  builder_name: string;
  builder_email: string;
  department: string;
  app_count: number;
  active_app_count: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [period, setPeriod] = useState('all-time');
  const [error, setError] = useState('');

  useEffect(() => {
    getLeaderboard({ period, limit: '20' })
      .then((res) => setEntries(res.leaderboard))
      .catch((e) => setError(e.message));
  }, [period]);

  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['all-time', 'quarter', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-md ${
                period === p ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              {p === 'all-time' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">Rank</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Builder</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Apps</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((e) => (
              <tr key={e.builder_email} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    e.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                    e.rank === 2 ? 'bg-gray-200 text-gray-700' :
                    e.rank === 3 ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {e.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/builder/${e.builder_email}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                    {e.builder_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{e.department}</td>
                <td className="px-4 py-3 text-right font-semibold">{e.app_count}</td>
                <td className="px-4 py-3 text-right text-gray-600">{e.active_app_count}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

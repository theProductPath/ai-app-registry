import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listApps } from '../api';
import Pagination from '../components/Pagination';

interface App {
  id: string;
  app_name: string;
  builder_name: string;
  department: string;
  build_tool: string;
  status: string;
  registered_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  experimental: 'bg-yellow-100 text-yellow-800',
  deprecated: 'bg-red-100 text-red-800',
  retired: 'bg-gray-100 text-gray-600',
};

export default function AppDirectory() {
  const [apps, setApps] = useState<App[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ department: '', build_tool: '', status: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const params: Record<string, string> = { page: String(page), per_page: '25' };
    if (filters.department) params.department = filters.department;
    if (filters.build_tool) params.build_tool = filters.build_tool;
    if (filters.status) params.status = filters.status;

    listApps(params)
      .then((res) => {
        setApps(res.data);
        setTotalPages(res.pagination.total_pages);
      })
      .catch((e) => setError(e.message));
  }, [page, filters]);

  const updateFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">App Directory</h1>

      <div className="flex gap-3 mb-4">
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="experimental">Experimental</option>
          <option value="deprecated">Deprecated</option>
          <option value="retired">Retired</option>
        </select>
        <select
          value={filters.build_tool}
          onChange={(e) => updateFilter('build_tool', e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">All tools</option>
          <option value="claude-code">Claude Code</option>
          <option value="cursor">Cursor</option>
          <option value="copilot">Copilot</option>
          <option value="codex">Codex</option>
          <option value="cowork">Cowork</option>
          <option value="other">Other</option>
        </select>
        <input
          type="text"
          placeholder="Filter by department..."
          value={filters.department}
          onChange={(e) => updateFilter('department', e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">App Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Builder</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tool</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Registered</th>
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
                <td className="px-4 py-3">
                  <Link to={`/builder/${app.builder_name}`} className="hover:text-indigo-600">
                    {app.builder_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{app.department}</td>
                <td className="px-4 py-3 text-gray-600">{app.build_tool}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || ''}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(app.registered_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {apps.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No apps found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

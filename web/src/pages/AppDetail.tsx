import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getApp } from '../api';

interface AppRecord {
  id: string;
  app_name: string;
  app_description: string;
  builder_name: string;
  builder_email: string;
  department: string;
  build_tool: string;
  app_type: string | null;
  tech_stack: string[] | null;
  repo_url: string | null;
  deployment_url: string | null;
  user_count: number | null;
  status: string;
  registered_at: string;
  last_checkin: string;
  metadata: Record<string, unknown> | null;
}

export default function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<AppRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) getApp(id).then(setApp).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!app) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <Link to="/apps" className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-block">&larr; Back to directory</Link>
      <h1 className="text-2xl font-bold mb-2">{app.app_name}</h1>
      <p className="text-gray-600 mb-6">{app.app_description}</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-700">Details</h2>
          <Row label="Builder" value={<Link to={`/builder/${app.builder_email}`} className="text-indigo-600 hover:text-indigo-800">{app.builder_name}</Link>} />
          <Row label="Email" value={app.builder_email} />
          <Row label="Department" value={app.department} />
          <Row label="Build Tool" value={app.build_tool} />
          <Row label="App Type" value={app.app_type || 'N/A'} />
          <Row label="Status" value={app.status} />
          <Row label="Users" value={app.user_count ?? 'N/A'} />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-700">Technical</h2>
          <Row label="Tech Stack" value={app.tech_stack?.join(', ') || 'N/A'} />
          <Row label="Repo" value={app.repo_url ? <a href={app.repo_url} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">{app.repo_url}</a> : 'N/A'} />
          <Row label="Deployment" value={app.deployment_url ? <a href={app.deployment_url} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">{app.deployment_url}</a> : 'N/A'} />
          <Row label="Registered" value={new Date(app.registered_at).toLocaleString()} />
          <Row label="Last Check-in" value={new Date(app.last_checkin).toLocaleString()} />
          {app.metadata && (
            <Row label="Metadata" value={<pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(app.metadata, null, 2)}</pre>} />
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );
}

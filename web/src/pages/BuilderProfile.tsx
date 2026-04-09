import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBuilderProfile } from '../api';
import StatsCard from '../components/StatsCard';

interface Profile {
  builder_name: string;
  builder_email: string;
  department: string;
  total_apps: number;
  active_apps: number;
  first_registration: string;
  latest_registration: string;
  apps: Array<{
    id: string;
    app_name: string;
    app_description: string;
    build_tool: string;
    status: string;
    user_count: number | null;
    registered_at: string;
    last_checkin: string;
  }>;
  tools_used: Record<string, number>;
}

export default function BuilderProfile() {
  const { email } = useParams<{ email: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (email) getBuilderProfile(email).then(setProfile).catch((e) => setError(e.message));
  }, [email]);

  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!profile) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <Link to="/leaderboard" className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-block">&larr; Back to leaderboard</Link>
      <h1 className="text-2xl font-bold mb-1">{profile.builder_name}</h1>
      <p className="text-gray-500 mb-6">{profile.builder_email} &middot; {profile.department}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Total Apps" value={profile.total_apps} />
        <StatsCard label="Active Apps" value={profile.active_apps} />
        <StatsCard label="First Registered" value={new Date(profile.first_registration).toLocaleDateString()} />
        <StatsCard label="Latest" value={new Date(profile.latest_registration).toLocaleDateString()} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Tools Used</h2>
        <div className="flex gap-3">
          {Object.entries(profile.tools_used).map(([tool, count]) => (
            <span key={tool} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
              {tool}: {count}
            </span>
          ))}
        </div>
      </div>

      <h2 className="font-semibold text-gray-700 mb-3">Apps</h2>
      <div className="space-y-3">
        {profile.apps.map((app) => (
          <Link
            key={app.id}
            to={`/apps/${app.id}`}
            className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-indigo-600">{app.app_name}</h3>
                <p className="text-sm text-gray-500 mt-1">{app.app_description}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                app.status === 'active' ? 'bg-green-100 text-green-800' :
                app.status === 'experimental' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {app.status}
              </span>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span>{app.build_tool}</span>
              <span>{app.user_count ?? 0} users</span>
              <span>Registered {new Date(app.registered_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { listApiKeys, createApiKey, revokeApiKey } from '../api';

interface ApiKey {
  id: string;
  key_prefix: string;
  owner_email: string;
  role: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

export default function Admin() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [error, setError] = useState('');
  const [newKeyResult, setNewKeyResult] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('builder');

  const loadKeys = () => {
    listApiKeys().then((res) => setKeys(res.keys)).catch((e) => setError(e.message));
  };

  useEffect(loadKeys, []);

  const handleCreate = async () => {
    if (!formEmail) return;
    try {
      const res = await createApiKey({ owner_email: formEmail, role: formRole });
      setNewKeyResult(res.api_key);
      setFormEmail('');
      loadKeys();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      loadKeys();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Console</h1>

      {error && <div className="text-red-600 mb-4">Error: {error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Create API Key</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Owner Email</label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Role</label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="builder">Builder</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
          >
            Create
          </button>
        </div>

        {newKeyResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm font-semibold text-green-800 mb-1">New API Key Created</p>
            <p className="text-xs text-green-700 mb-2">Copy this now — it won't be shown again.</p>
            <code className="block bg-white p-2 rounded text-sm font-mono break-all">{newKeyResult}</code>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Prefix</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last Used</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {keys.map((key) => (
              <tr key={key.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{key.key_prefix}...</td>
                <td className="px-4 py-3">{key.owner_email}</td>
                <td className="px-4 py-3 capitalize">{key.role}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(key.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-500">
                  {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  {key.revoked ? (
                    <span className="text-red-600 text-xs font-medium">Revoked</span>
                  ) : (
                    <span className="text-green-600 text-xs font-medium">Active</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!key.revoked && (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

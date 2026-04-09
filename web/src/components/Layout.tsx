import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { setApiKey, getStoredApiKey } from '../api';

const nav = [
  { path: '/', label: 'Dashboard' },
  { path: '/apps', label: 'App Directory' },
  { path: '/leaderboard', label: 'Leaderboard' },
  { path: '/staleness', label: 'Staleness' },
  { path: '/skills', label: 'Skills' },
  { path: '/admin', label: 'Admin' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [keyInput, setKeyInput] = useState(getStoredApiKey());
  const [showKeyModal, setShowKeyModal] = useState(!getStoredApiKey());

  const saveKey = () => {
    setApiKey(keyInput);
    setShowKeyModal(false);
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold text-indigo-600">
              AI App Registry
            </Link>
            <nav className="hidden md:flex space-x-1">
              {nav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => setShowKeyModal(true)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {getStoredApiKey() ? 'API Key Set' : 'Set API Key'}
            </button>
          </div>
        </div>
      </header>

      {showKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Enter API Key</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter your API key to access the registry. Get one from your admin.
            </p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ar-..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 text-sm"
            />
            <div className="flex gap-2 justify-end">
              {getStoredApiKey() && (
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={saveKey}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

const BASE = '/api/v1';

function getApiKey(): string {
  return localStorage.getItem('apiKey') || '';
}

export function setApiKey(key: string) {
  localStorage.setItem('apiKey', key);
}

export function getStoredApiKey(): string {
  return getApiKey();
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const apiKey = getApiKey();
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json();
  }
  return res;
}

// Apps
export const listApps = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request(`/apps${qs}`);
};
export const getApp = (id: string) => request(`/apps/${id}`);
export const createApp = (data: Record<string, unknown>) => request('/apps', { method: 'POST', body: JSON.stringify(data) });
export const updateApp = (id: string, data: Record<string, unknown>) => request(`/apps/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const checkinApp = (id: string, data?: Record<string, unknown>) => request(`/apps/${id}/checkin`, { method: 'POST', body: JSON.stringify(data || {}) });

// Dashboard
export const getSummary = () => request('/dashboard/summary');
export const getLeaderboard = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request(`/dashboard/leaderboard${qs}`);
};
export const getBuilderProfile = (email: string) => request(`/dashboard/builder/${encodeURIComponent(email)}`);
export const getStaleness = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request(`/dashboard/staleness${qs}`);
};

// Skills (no auth needed)
export const listSkills = () => fetch(`${BASE}/skills`).then(r => r.json());

// Admin
export const listApiKeys = () => request('/admin/api-keys');
export const createApiKey = (data: { owner_email: string; role: string }) => request('/admin/api-keys', { method: 'POST', body: JSON.stringify(data) });
export const revokeApiKey = (id: string) => request(`/admin/api-keys/${id}`, { method: 'DELETE' });

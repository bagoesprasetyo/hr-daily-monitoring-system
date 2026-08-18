const API_BASE = '/api';

/**
 * Fetch wrapper with JWT credentials and automatic error handling
 */
export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  let url = `${API_BASE}${endpoint}`;
  if (options.params && typeof options.params === 'object') {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    const error = new Error('Gagal terhubung ke server backend. Pastikan server backend sedang berjalan.');
    error.status = 0;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  let data;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      throw new Error(`Format respon dari server tidak valid (JSON error). Kode: ${response.status}`);
    }
  } else {
    const text = await response.text();
    const isHtml = text.trim().startsWith('<');
    const msg = isHtml
      ? `Server backend tidak merespons API (${response.status}). Pastikan server backend berjalan.`
      : (text || `HTTP Error ${response.status}`);
    const error = new Error(msg);
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    // If token expired, try to refresh
    if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Retry original request with new token
        return request(endpoint, options);
      }
    }
    
    const error = new Error(data.message || 'Terjadi kesalahan pada server');
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  return data;
}

async function tryRefreshToken() {
  const refreshTokenValue = localStorage.getItem('refresh_token');
  if (!refreshTokenValue) {
    logout();
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshTokenValue }),
    });

    if (!res.ok) throw new Error('Refresh failed');

    const data = await res.json();
    localStorage.setItem('access_token', data.data.access_token);
    return true;
  } catch (err) {
    logout();
    return false;
  }
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('auth-change'));
}

const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }).then(r => ({ data: r })),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }).then(r => ({ data: r })),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }).then(r => ({ data: r })),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }).then(r => ({ data: r })),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }).then(r => ({ data: r })),
};

export default api;

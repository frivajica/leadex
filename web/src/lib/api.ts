const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

export interface User {
  id: number;
  email: string;
}

export interface Job {
  id: number;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total_businesses: number;
  leads_found: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
  center_lat: number;
  center_lng: number;
  center_address?: string;
  categories?: string[];
  radius: number;
}

export interface Lead {
  name: string;
  business_type: string;
  address: string;
  phone: string;
  rating: number;
  review_count: number;
  website: string;
  maps_url: string;
  distance_km: number;
  distance_miles: number;
  lead_score: number;
  [key: string]: unknown;
}

export interface ApiKeys {
  id: number;
  key_name: string;
  is_active: boolean;
  created_at: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

export const authApi = {
  register: (email: string) =>
    fetchApi<{ message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  login: (email: string) =>
    fetchApi<{ message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verify: (token: string) =>
    fetchApi<{ access_token: string; token_type: string; user: User }>(
      '/api/auth/verify',
      {
        method: 'POST',
        body: JSON.stringify({ token }),
      }
    ),

  me: () => fetchApi<User>('/api/auth/me'),

  registerPassword: (email: string, password: string) =>
    fetchApi<{ access_token: string; token_type: string; user: User }>(
      '/api/auth/register/password',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    ),

  loginPassword: (email: string, password: string) =>
    fetchApi<{ access_token: string; token_type: string; user: User }>(
      '/api/auth/login/password',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    ),

  logout: () =>
    fetchApi<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    }),
};

export const jobsApi = {
  list: (limit = 50, offset = 0) =>
    fetchApi<{ jobs: Job[] }>(`/api/jobs?limit=${limit}&offset=${offset}`),

  get: (id: number) => fetchApi<Job>(`/api/jobs/${id}`),

  create: (data: {
    name: string;
    center_lat: number;
    center_lng: number;
    center_address?: string;
    categories?: string[];
    radius?: number;
    min_rating?: number;
    min_reviews?: number;
    min_photos?: number;
    use_quality_filters?: boolean;
    sort_by?: string;
  }) =>
    fetchApi<{ id: number; name: string; status: string; message: string }>(
      '/api/jobs',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  delete: (id: number) =>
    fetchApi<{ message: string }>(`/api/jobs/${id}`, {
      method: 'DELETE',
    }),

  cancel: (id: number) =>
    fetchApi<{ message: string }>(`/api/jobs/${id}/cancel`, {
      method: 'POST',
    }),

  restart: (id: number) =>
    fetchApi<{ id: number; status: string; message: string }>(
      `/api/jobs/${id}/restart`,
      {
        method: 'POST',
      }
    ),
};

export const resultsApi = {
  list: (jobId: number, limit = 100, offset = 0) =>
    fetchApi<{
      job_id: number;
      total: number;
      limit: number;
      offset: number;
      results: Lead[];
    }>(`/api/jobs/${jobId}/results?limit=${limit}&offset=${offset}`),

  exportCsv: (jobId: number) =>
    fetchApi<Blob>(`/api/jobs/${jobId}/results/export?format=csv`),

  exportJson: (jobId: number) =>
    fetchApi<Blob>(`/api/jobs/${jobId}/results/export?format=json`),
};

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export interface Translations {
  [key: string]: string;
}

export interface TranslationsData {
  locale: string;
  translations: Translations;
  available_locales: string[];
}

export const categoriesApi = {
  list: (locale: string = 'en') =>
    fetchApi<{ categories: Category[]; total: number; locale: string }>(`/api/categories?locale=${locale}`),
};

export const translationsApi = {
  get: (locale: string = 'en') =>
    fetchApi<TranslationsData>(`/api/translations?locale=${locale}`),
};

export const keysApi = {
  list: () => fetchApi<{ keys: ApiKeys[] }>('/api/keys'),

  create: (keyName: string, apiKey: string) =>
    fetchApi<{ id: number; key_name: string; message: string }>('/api/keys', {
      method: 'POST',
      body: JSON.stringify({ key_name: keyName, api_key: apiKey }),
    }),

  delete: (keyId: number) =>
    fetchApi<{ message: string }>(`/api/keys/${keyId}`, {
      method: 'DELETE',
    }),
};

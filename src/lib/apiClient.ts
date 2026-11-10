/**
 * CAREMEDIA Full-Stack REST API Client
 * Communicates with the built-in /api/* backend endpoints (Express & Netlify Functions)
 * with graceful automatic fallback to browser LocalStorage + IndexedDB Media Vault.
 */

const TOKEN_STORAGE_KEY = 'caremedia_admin_jwt_token_v1';

export function getStoredAdminToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const token = getStoredAdminToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const studioApi = {
  login: async (email: string, passcode: string) => {
    const res = await apiRequest<{
      authenticated: boolean;
      email: string;
      token: string;
      role: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, passcode }),
    });
    if (res?.token) {
      setStoredAdminToken(res.token);
    }
    return res;
  },

  logout: () => {
    setStoredAdminToken(null);
  },

  saveBooking: (booking: unknown) =>
    apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    }),

  updateBookingStatus: (id: string, status: string) =>
    apiRequest(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteBooking: (id: string) =>
    apiRequest(`/bookings/${id}`, {
      method: 'DELETE',
    }),

  savePortfolioItem: (item: unknown) =>
    apiRequest('/portfolio', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  savePortfolioBatch: (items: unknown[]) =>
    apiRequest('/portfolio/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  deletePortfolioItem: (id: string) =>
    apiRequest(`/portfolio/${id}`, {
      method: 'DELETE',
    }),

  saveCategory: (cat: unknown) =>
    apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(cat),
    }),

  deleteCategory: (id: string) =>
    apiRequest(`/categories/${id}`, {
      method: 'DELETE',
    }),

  saveService: (srv: unknown) =>
    apiRequest('/services', {
      method: 'POST',
      body: JSON.stringify(srv),
    }),

  deleteService: (id: string) =>
    apiRequest(`/services/${id}`, {
      method: 'DELETE',
    }),

  saveTestimonial: (review: unknown) =>
    apiRequest('/testimonials', {
      method: 'POST',
      body: JSON.stringify(review),
    }),

  deleteTestimonial: (id: string) =>
    apiRequest(`/testimonials/${id}`, {
      method: 'DELETE',
    }),

  saveSiteSettings: (settings: unknown) =>
    apiRequest('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  seedDefaultDatabase: () =>
    apiRequest('/seed', {
      method: 'POST',
    }),
};

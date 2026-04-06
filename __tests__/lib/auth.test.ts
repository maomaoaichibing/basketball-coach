import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// auth.ts checks typeof window === 'undefined', so we need to provide it

function setupBrowserEnvironment() {
  const store: Record<string, string> = {};

  const getItemFn = (key: string) => store[key] ?? null;
  const setItemFn = (key: string, value: string) => { store[key] = value; };
  const removeItemFn = (key: string) => { delete store[key]; };
  const clearFn = () => { Object.keys(store).forEach(k => delete store[k]); };

  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: { getItem: getItemFn, setItem: setItemFn, removeItem: removeItemFn, clear: clearFn } },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: getItemFn, setItem: setItemFn, removeItem: removeItemFn, clear: clearFn, length: 0, key: jest.fn() },
    writable: true,
    configurable: true,
  });

  return store;
}

// Import after defining the global mocks
// jest.resetModules() allows re-importing
function getAuth() {
  jest.resetModules();
  return require('@/lib/auth');
}

describe('auth - getAuthFromStorage', () => {
  beforeEach(() => {
    setupBrowserEnvironment();
  });

  it('should return null values when storage is empty', () => {
    const { getAuthFromStorage } = getAuth();
    const result = getAuthFromStorage();
    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
  });

  it('should return token from storage', () => {
    const store = setupBrowserEnvironment();
    store['auth_token'] = 'test-token-123';
    const { getAuthFromStorage } = getAuth();
    const result = getAuthFromStorage();
    expect(result.token).toBe('test-token-123');
    expect(result.user).toBeNull();
  });

  it('should return parsed user from storage', () => {
    const store = setupBrowserEnvironment();
    const user = {
      id: 'coach-1',
      email: 'test@coach.com',
      name: '测试教练',
      role: 'head_coach',
      specialties: [],
    };
    store['auth_user'] = JSON.stringify(user);
    const { getAuthFromStorage } = getAuth();
    const result = getAuthFromStorage();
    expect(result.user).toEqual(user);
  });

  it('should return null for corrupted user data', () => {
    const store = setupBrowserEnvironment();
    store['auth_user'] = 'not-valid-json';
    const { getAuthFromStorage } = getAuth();
    const result = getAuthFromStorage();
    expect(result.user).toBeNull();
  });
});

describe('auth - saveAuthToStorage', () => {
  beforeEach(() => {
    setupBrowserEnvironment();
  });

  it('should save token and user to storage', () => {
    const store = setupBrowserEnvironment();
    const { saveAuthToStorage } = getAuth();
    const user = {
      id: 'coach-1',
      email: 'test@coach.com',
      name: '测试教练',
      role: 'head_coach',
      specialties: [],
    };

    saveAuthToStorage(user, 'my-token');

    expect(store['auth_token']).toBe('my-token');
    expect(store['auth_user']).toBe(JSON.stringify(user));
  });
});

describe('auth - clearAuthFromStorage', () => {
  beforeEach(() => {
    setupBrowserEnvironment();
  });

  it('should remove token and user from storage', () => {
    const store = setupBrowserEnvironment();
    store['auth_token'] = 'some-token';
    store['auth_user'] = '{}';
    const { clearAuthFromStorage } = getAuth();

    clearAuthFromStorage();

    expect(store['auth_token']).toBeUndefined();
    expect(store['auth_user']).toBeUndefined();
  });
});

describe('auth - getAuthHeader', () => {
  beforeEach(() => {
    setupBrowserEnvironment();
  });

  it('should return empty object when no token', () => {
    const { getAuthHeader } = getAuth();
    const headers = getAuthHeader();
    expect(headers).toEqual({});
  });

  it('should return Authorization header when token exists', () => {
    const store = setupBrowserEnvironment();
    store['auth_token'] = 'my-bearer-token';
    const { getAuthHeader } = getAuth();
    const headers = getAuthHeader();
    expect(headers).toEqual({
      Authorization: 'Bearer my-bearer-token',
    });
  });
});

describe('auth - fetchWithAuth', () => {
  beforeEach(() => {
    setupBrowserEnvironment();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should add auth header to fetch options', async () => {
    const store = setupBrowserEnvironment();
    store['auth_token'] = 'test-token';
    const { fetchWithAuth } = getAuth();

    const mockFetch = jest.fn().mockImplementation(() => Promise.resolve({
      ok: true,
      json: async () => ({ data: 'test' }),
    }));
    (global as any).fetch = mockFetch;

    await fetchWithAuth('/api/test', { method: 'GET' });

    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      method: 'GET',
      headers: { Authorization: 'Bearer test-token' },
    });
  });

  it('should not add auth header when no token', async () => {
    const { fetchWithAuth } = getAuth();

    const mockFetch = jest.fn().mockImplementation(() => Promise.resolve({
      ok: true,
      json: async () => ({ data: 'test' }),
    }));
    (global as any).fetch = mockFetch;

    await fetchWithAuth('/api/test');

    expect(mockFetch).toHaveBeenCalledWith('/api/test', { headers: {} });
  });

  it('should preserve existing headers', async () => {
    const store = setupBrowserEnvironment();
    store['auth_token'] = 'test-token';
    const { fetchWithAuth } = getAuth();

    const mockFetch = jest.fn().mockImplementation(() => Promise.resolve({
      ok: true,
      json: async () => ({ data: 'test' }),
    }));
    (global as any).fetch = mockFetch;

    await fetchWithAuth('/api/test', {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });
  });
});

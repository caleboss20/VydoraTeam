/**
 * Dual API endpoint resolver: Railway (cloud) ↔ local device backend.
 *
 * Prefers the last healthy host, probes `/health`, and flips on network failure
 * so Expo Go works whether Railway or USB/local Spring Boot is up.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type EndpointId = 'cloud' | 'local';

export type ApiEndpoint = {
  id: EndpointId;
  apiBase: string;
  wsBase: string;
};

const STORAGE_KEY = 'vydora:apiEndpointId';
const HEALTH_TIMEOUT_MS = 4_000;

function strip(value?: string | null): string {
  return (value ?? '').trim().replace(/\/$/, '');
}

function apiToWs(apiBase: string): string {
  return apiBase.replace(/\/api\/v1$/i, '/ws');
}

function apiToHealth(apiBase: string): string {
  return apiBase.replace(/\/api\/v1$/i, '/health');
}

function toBrokerUrl(wsBase: string): string {
  let url = wsBase.replace(/^http/i, 'ws');
  url = url.replace(/\/ws(-native)?$/i, '/ws-native');
  return url;
}

function isUsableUrl(url: string): boolean {
  if (!url) return false;
  if (/YOUR_|REPLACE|example\.com|localhost_placeholder/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

function buildCandidates(): ApiEndpoint[] {
  const cloudApi = strip(process.env.EXPO_PUBLIC_API_BASE_CLOUD);
  const localApi =
    strip(process.env.EXPO_PUBLIC_API_BASE_LOCAL) ||
    strip(process.env.EXPO_PUBLIC_API_BASE) ||
    'http://127.0.0.1:8080/api/v1';

  const cloudWs =
    strip(process.env.EXPO_PUBLIC_WS_BASE_CLOUD) || (cloudApi ? apiToWs(cloudApi) : '');
  const localWs =
    strip(process.env.EXPO_PUBLIC_WS_BASE_LOCAL) ||
    strip(process.env.EXPO_PUBLIC_WS_BASE) ||
    apiToWs(localApi);

  const list: ApiEndpoint[] = [];
  if (isUsableUrl(cloudApi)) {
    list.push({
      id: 'cloud',
      apiBase: cloudApi,
      wsBase: isUsableUrl(cloudWs) ? cloudWs : apiToWs(cloudApi),
    });
  }
  if (isUsableUrl(localApi)) {
    list.push({
      id: 'local',
      apiBase: localApi,
      wsBase: isUsableUrl(localWs) ? localWs : apiToWs(localApi),
    });
  }
  return list;
}

const CANDIDATES = buildCandidates();

function preferredId(): EndpointId {
  const raw = strip(process.env.EXPO_PUBLIC_API_PREFER).toLowerCase();
  if (raw === 'local' || raw === 'cloud') return raw;
  return CANDIDATES.some((c) => c.id === 'cloud') ? 'cloud' : 'local';
}

function pickById(id: EndpointId | null | undefined): ApiEndpoint | null {
  if (!id) return null;
  return CANDIDATES.find((c) => c.id === id) ?? null;
}

let active: ApiEndpoint =
  pickById(preferredId()) ?? CANDIDATES[0] ?? {
    id: 'local',
    apiBase: 'http://127.0.0.1:8080/api/v1',
    wsBase: 'http://127.0.0.1:8080/ws',
  };

let resolveInFlight: Promise<ApiEndpoint> | null = null;

export function getActiveEndpoint(): ApiEndpoint {
  return active;
}

export function getApiBase(): string {
  return active.apiBase;
}

export function getWsBase(): string {
  return active.wsBase;
}

export function getWsBrokerUrl(): string {
  const override = strip(process.env.EXPO_PUBLIC_WS_BROKER_URL);
  if (override) return override;
  return toBrokerUrl(active.wsBase);
}

export function listApiEndpoints(): ApiEndpoint[] {
  return [...CANDIDATES];
}

async function probeHealthy(endpoint: ApiEndpoint): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(apiToHealth(endpoint.apiBase), {
      method: 'GET',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function orderForProbe(lastId: EndpointId | null): ApiEndpoint[] {
  const prefer = preferredId();
  const ranked = [...CANDIDATES].sort((a, b) => {
    const score = (e: ApiEndpoint) =>
      (e.id === lastId ? 0 : 100) + (e.id === prefer ? 0 : 10) + (e.id === 'cloud' ? 0 : 1);
    return score(a) - score(b);
  });
  return ranked;
}

async function activate(endpoint: ApiEndpoint): Promise<ApiEndpoint> {
  active = endpoint;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, endpoint.id);
  } catch {
    // ignore storage errors
  }
  if (__DEV__) {
    console.log(`[api] using ${endpoint.id} → ${endpoint.apiBase}`);
  }
  return endpoint;
}

/**
 * Probe candidates and lock onto the first healthy host.
 * Safe to call multiple times; concurrent callers share one probe.
 */
export async function resolveApiEndpoint(): Promise<ApiEndpoint> {
  if (resolveInFlight) return resolveInFlight;

  resolveInFlight = (async () => {
    let lastId: EndpointId | null = null;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'cloud' || stored === 'local') lastId = stored;
    } catch {
      // ignore
    }

    const ordered = orderForProbe(lastId);
    if (ordered.length === 0) return active;

    for (const candidate of ordered) {
      if (await probeHealthy(candidate)) {
        return activate(candidate);
      }
    }

    // Nothing answered — keep preferred / last so errors stay actionable.
    const fallback = pickById(lastId) ?? pickById(preferredId()) ?? ordered[0];
    return activate(fallback);
  })();

  try {
    return await resolveInFlight;
  } finally {
    resolveInFlight = null;
  }
}

/**
 * After a network failure on the active host, try the other candidate(s).
 * Returns true if we switched to a healthy alternate.
 */
export async function failoverApiEndpoint(): Promise<boolean> {
  const others = CANDIDATES.filter((c) => c.id !== active.id);
  for (const candidate of others) {
    if (await probeHealthy(candidate)) {
      await activate(candidate);
      return true;
    }
  }
  return false;
}

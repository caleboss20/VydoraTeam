
import { CONFIG } from '../config';
import { User } from '../types';
// ─── Mock Credentials ────────────────────────────────────────────
const MOCK_CREDENTIALS = {
  email: 'mrrcaleboss@gmail.com',
  password: 'Fabbi324#314',
};
const MOCK_USER: User = {
  id: '1',
  name: 'Caleb Dwamena',
  email: 'mrrcaleboss@gmail.com',
  initials: 'CD',
  color: '#F5C518',
};
// ─── Service ─────────────────────────────────────────────────────
export const authService = {
  login: async (
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> => {
    if (CONFIG.USE_MOCK) {
      if (
        email !== MOCK_CREDENTIALS.email ||
        password !== MOCK_CREDENTIALS.password
      ) {
        throw new Error('Invalid email or password');
      }
      return { user: MOCK_USER, token: 'mock-jwt-token-123' };
    }
    const res = await fetch(`${CONFIG.API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },
  register: async (
    name: string,
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> => {
    if (CONFIG.USE_MOCK) {
      return {
        user: { ...MOCK_USER, name, email },
        token: 'mock-jwt-token-123',
      };
    }
    const res = await fetch(`${CONFIG.API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  },
  logout: async (token: string): Promise<void> => {
    if (CONFIG.USE_MOCK) return;
    await fetch(`${CONFIG.API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  getMe: async (token: string): Promise<User> => {
    if (CONFIG.USE_MOCK) return MOCK_USER;
    const res = await fetch(`${CONFIG.API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  },
};
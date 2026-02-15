import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

interface AuthState {
  user: User | null;
  csrfToken: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setCsrfToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      csrfToken: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setCsrfToken: (csrfToken) => set({ csrfToken }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, csrfToken: null }),
    }),
    {
      name: 'gn-auth',
      partialize: (state) => ({ csrfToken: state.csrfToken }),
    }
  )
);

// Fetch CSRF token
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/csrf', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      useAuthStore.getState().setCsrfToken(data.csrfToken);
      return data.csrfToken;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  return null;
}

// Get current user
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      useAuthStore.getState().setUser(data.user);
      return data.user;
    }
  } catch (error) {
    console.error('Failed to fetch user:', error);
  }
  useAuthStore.getState().setUser(null);
  return null;
}

// Initialize auth (call on app load)
export async function initAuth(): Promise<void> {
  useAuthStore.getState().setLoading(true);
  await Promise.all([fetchCsrfToken(), fetchCurrentUser()]);
  useAuthStore.getState().setLoading(false);
}

// Auth API functions
export async function signup(email: string, password: string, name?: string, phone?: string): Promise<{ success: boolean; requiresOtp?: boolean; error?: string; field?: string }> {
  const csrfToken = useAuthStore.getState().csrfToken || await fetchCsrfToken();
  
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, name, phone }),
    });
    
    const data = await res.json();
    
    if (res.ok) {
      useAuthStore.getState().setUser(data.user);
      if (data.csrfToken) {
        useAuthStore.getState().setCsrfToken(data.csrfToken);
      }
      return { success: true, requiresOtp: data.requiresOtp };
    }
    
    return { success: false, error: data.message, field: data.field };
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export async function login(email: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; error?: string; field?: string }> {
  const csrfToken = useAuthStore.getState().csrfToken || await fetchCsrfToken();
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, rememberMe }),
    });
    
    const data = await res.json();
    
    if (res.ok) {
      useAuthStore.getState().setUser(data.user);
      if (data.csrfToken) {
        useAuthStore.getState().setCsrfToken(data.csrfToken);
      }
      return { success: true };
    }
    
    return { success: false, error: data.message, field: data.field };
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export async function logout(): Promise<void> {
  const csrfToken = useAuthStore.getState().csrfToken;
  
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  useAuthStore.getState().logout();
}

export async function forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
  const csrfToken = useAuthStore.getState().csrfToken || await fetchCsrfToken();
  
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    
    const data = await res.json();
    return { success: true }; // Always return success to not reveal email existence
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; error?: string; field?: string }> {
  const csrfToken = useAuthStore.getState().csrfToken || await fetchCsrfToken();
  
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify({ token, password }),
    });
    
    const data = await res.json();
    
    if (res.ok) {
      return { success: true };
    }
    
    return { success: false, error: data.message, field: data.field };
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  const csrfToken = useAuthStore.getState().csrfToken || await fetchCsrfToken();
  
  try {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    
    const data = await res.json();
    
    if (res.ok) {
      // Refresh user data
      await fetchCurrentUser();
      return { success: true };
    }
    
    return { success: false, error: data.message };
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

export async function resendVerification(): Promise<{ success: boolean; error?: string }> {
  const csrfToken = useAuthStore.getState().csrfToken || await fetchCsrfToken();
  
  try {
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken || '',
      },
      credentials: 'include',
    });
    
    const data = await res.json();
    
    if (res.ok) {
      return { success: true };
    }
    
    return { success: false, error: data.message };
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// Password validation helper
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 10) {
    errors.push('At least 10 characters');
  }
  
  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score < 3) {
    errors.push('Include at least 3 of: uppercase, lowercase, number, symbol');
  }
  
  return { valid: errors.length === 0, errors };
}

export function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Fair', color: 'bg-yellow-500' };
  if (score <= 5) return { score, label: 'Good', color: 'bg-blue-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

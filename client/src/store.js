import { create } from 'zustand';
import { api } from './api';

export const useAppStore = create((set, get) => ({
  // Auth state
  user: null,
  isAuthenticated: false,
  
  // App state
  tables: [],
  schema: {},
  selectedTable: '',
  selectedColumns: [],
  where: [],
  joins: [],
  aggregations: [],
  sql: '',
  rows: [],
  
  // Auth actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      set({ user: response.data.user, isAuthenticated: true });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },
  
  register: async (name, email, password) => {
    try {
      await api.post('/auth/register', { name, email, password });
      // Auto-login after registration
      return get().login(email, password);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
  
  checkAuth: async () => {
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data.user, isAuthenticated: true });
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    }
  },
  
  // App actions
  setSchema: (data) => set({ tables: data.tables, schema: data.schema }),
  setSelectedTable: (t) => set({ selectedTable: t, selectedColumns: [], where: [], joins: [], aggregations: [] }),
  setSelectedColumns: (cols) => set({ selectedColumns: cols }),
  setWhere: (w) => set({ where: w }),
  setJoins: (j) => set({ joins: j }),
  setAggregations: (a) => set({ aggregations: a }),
  setResult: ({ sql, rows }) => set({ sql, rows }),
}));

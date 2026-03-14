import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@gestao:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

type ReportQueryParams = Record<string, string | number | boolean | null | undefined>;

export const reportsService = {
  getVisits: async (params: ReportQueryParams) => {
    const response = await api.get('/reports/visits', { params });
    return response.data;
  },
  getStats: async (params: ReportQueryParams) => {
    const response = await api.get('/reports/stats', { params });
    return response.data;
  }
};

import axios from 'axios';
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
export const apiClient = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('firebaseToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

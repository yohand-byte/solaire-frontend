import { apiClient } from './client';
export const healthApi = { ping: () => apiClient.get('/health') };

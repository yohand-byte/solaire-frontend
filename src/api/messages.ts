import { apiClient } from './client';
export const messagesApi = { list: (projectId: string) => apiClient.get('/messages', { params: { projectId } }), send: (projectId: string, content: string) => apiClient.post('/messages', { projectId, content }) };

import { apiClient } from './client';
import { Message } from '../types';

export const messagesApi = {
  list: (projectId?: string) => apiClient.get<{ items: Message[] }>('/messages', { params: { projectId } }),
  create: (payload: { projectId: string; content: string; recipientId?: string }) => apiClient.post<Message>('/messages', payload),
  markRead: (id: string) => apiClient.put<Message>(`/messages/${id}/read`),
};

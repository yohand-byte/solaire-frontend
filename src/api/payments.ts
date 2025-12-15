import { apiClient } from './client';
export const paymentsApi = { createIntent: (invoiceId: string) => apiClient.post('/payments/intents', { invoiceId }), confirm: (invoiceId: string) => apiClient.post('/payments/confirm', { invoiceId }) };

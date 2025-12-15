export interface User { uid: string; email: string; name: string; role: 'admin'|'installer'|'client'; createdAt: Date; isActive: boolean; }
export interface Project { id: string; clientId: string; installerId: string; title: string; address: string; status: 'draft'|'active'|'completed'; powerOutput: number; createdAt: Date; }
export interface Workflow { id: string; projectId: string; type: 'dp'|'consuel'|'enedis'; status: 'pending'|'in_progress'|'completed'|'failed'; createdAt: Date; }
export interface Invoice { id: string; projectId: string; number: string; total: number; status: 'draft'|'sent'|'paid'; createdAt: Date; }
export interface Message { id: string; projectId: string; senderId: string; recipientId?: string; content: string; createdAt: Date; read?: boolean; }
export interface Document { id: string; projectId: string; filename: string; fileUrl: string; uploadedAt: Date; }

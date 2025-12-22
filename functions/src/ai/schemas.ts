import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const summarizeInputSchema = z.object({
  dossierId: z.string().min(1, "dossierId requis"),
  refresh: z.boolean().optional()
});

export const nextActionsInputSchema = z.object({
  dossierId: z.string().min(1, "dossierId requis"),
  refresh: z.boolean().optional(),
  actionUpdate: z.object({
    actionId: z.string().min(1),
    status: z.enum(["approved", "rejected", "done"])
  }).optional()
});

export const riskSchema = z.object({
  label: z.string(),
  evidence: z.string(),
  severity: z.enum(["low", "medium", "high"])
});

export const actionSchema = z.object({
  title: z.string(),
  description: z.string(),
  dueAt: isoDate,
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "approved", "rejected", "done"]).default("pending")
});

export const summaryResponseSchema = z.object({
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  risks: z.array(riskSchema).default([]),
  actions: z.array(actionSchema.omit({ status: true })).default([])
}).transform((payload) => ({
  ...payload,
  actions: (payload.actions || []).map((a) => ({ ...a, status: "pending" as const }))
}));

export const actionsResponseSchema = z.object({
  actions: z.array(actionSchema.omit({ status: true })).default([])
}).transform((payload) => ({
  actions: (payload.actions || []).map((a) => ({ ...a, status: "pending" as const }))
}));

export type SummarizeInput = z.infer<typeof summarizeInputSchema>;
export type NextActionsInput = z.infer<typeof nextActionsInputSchema>;
export type ActionStatusUpdate = NonNullable<NextActionsInput["actionUpdate"]>;
export type SummaryResponse = z.infer<typeof summaryResponseSchema>;
export type ActionsResponse = z.infer<typeof actionsResponseSchema>;
export type AiAction = z.infer<typeof actionSchema>;

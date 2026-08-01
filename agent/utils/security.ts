import { z } from 'zod';

// Sanitize user input to prevent injection attacks
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    // Remove potential SQL injection patterns
    .replace(/['";\\]/g, '')
    // Remove potential command injection
    .replace(/[;&|`$()]/g, '')
    // Limit length
    .slice(0, 10000)
    .trim();
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate URN format (basic check)
export function isValidUrn(urn: string): boolean {
  return urn.startsWith('urn:li:') && urn.length > 10 && urn.length < 500;
}

// Validate priority values
export function isValidPriority(priority: string): boolean {
  return ['low', 'medium', 'high'].includes(priority);
}

// Sanitize LLM prompt to prevent prompt injection
export function sanitizePrompt(prompt: string): string {
  if (typeof prompt !== 'string') return '';
  
  return prompt
    // Remove potential prompt injection patterns
    .replace(/ignore (previous|all) instructions/gi, '')
    .replace(/system:/gi, '')
    .replace(/assistant:/gi, '')
    // Limit length
    .slice(0, 5000)
    .trim();
}

// Mask sensitive data for logging
export function maskToken(token: string): string {
  if (!token || typeof token !== 'string') return '[REDACTED]';
  if (token.length <= 8) return '[REDACTED]';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

// Sanitize SQL to prevent injection (basic sanitization)
export function sanitizeSQL(sql: string): string {
  if (typeof sql !== 'string') return '';
  
  return sql
    // Remove potential SQL injection patterns
    .replace(/--.*$/gm, '') // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\b(DROP|DELETE|TRUNCATE|ALTER|EXEC|EXECUTE)\b/gi, '') // Remove dangerous keywords
    // Limit length
    .slice(0, 10000)
    .trim();
}

// Zod schemas for request validation
export const ChangeRequestSchema = z.object({
  description: z.string().min(1).max(10000),
  datasetUrn: z.string().max(500).optional(),
  requestedBy: z.string().email().max(255),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

export const ApprovalRequestSchema = z.object({
  approved: z.boolean(),
  reviewer: z.string().email().max(255),
  comment: z.string().max(5000).optional(),
  decidedAt: z.string().optional(),
});

export type ValidatedChangeRequest = z.infer<typeof ChangeRequestSchema>;
export type ValidatedApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

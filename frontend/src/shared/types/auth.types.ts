// Re-exports from domain module — kept for backwards compatibility.
// Prefer importing directly from:
//   import type { ... } from '@modules/auth/domain/types'
export type { AuthUser, AuthResult, LoginDTO, RegisterDTO } from '@modules/auth/domain/types';

/** @deprecated — use CarryoverData from finances domain instead */
export interface MonthlyBudget {
  id?: string;
  userId?: string;
  year: number;
  month: number;
  initialAmount: number;
  label?: string;
}

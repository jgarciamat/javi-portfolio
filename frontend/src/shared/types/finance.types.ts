// Re-exports from domain modules — kept for backwards compatibility.
// Prefer importing directly from the domain module:
//   import type { ... } from '@modules/finances/domain/types'
export type {
    TransactionType,
    Transaction,
    CreateTransactionDTO,
    Category,
    CreateCategoryDTO,
    FinancialSummary,
    MonthData,
    AnnualSummary,
    CarryoverData,
} from '@modules/finances/domain/types';

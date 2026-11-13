// The figures the open calculators start with: the first values of their form and the worked
// example of their prerendered page (scripts/seo/pages.mjs), so both show the same result.
import type { RetaInput } from './retaCalc';
import type { SalaryInput } from './salaryCalc';

/** 30.000 € gross in 14 payments, 35 years old, no children, permanent contract. */
export const SALARY_EXAMPLE: SalaryInput = {
  gross: 30000,
  payments: 14,
  age: 35,
  situation: 3,
  children: 0,
  under3: 0,
  sharedChildren: false,
  disability: 0,
  contract: 'indefinite',
};

/** 2.000 € of net income a month, on one's own, without the flat rate. */
export const RETA_EXAMPLE: RetaInput = {
  monthlyNet: 2000,
  person: 'individual',
  flatRate: false,
};

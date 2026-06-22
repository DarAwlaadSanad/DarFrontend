export enum SalaryType {
  FixedMonthly = 1,
  PerGroup = 2
}

export enum TransactionType {
  ManualBonus = 1,
  ManualDeduction = 2,
  AbsenceDeduction = 3,
  SubstituteBonus = 4,
  DelayDeduction = 5
}

export interface UserContract {
  id: number;
  userId: string;
  userName: string;
  salaryType: SalaryType;
  amount: number;
}

export interface SetUserContract {
  userId: string;
  salaryType: SalaryType;
  amount: number;
}

export interface FinancialSetting {
  delayDeductionAmount: number;
  absenceSessionDeduction: number;
}

export interface FinancialTransaction {
  id: number;
  userId: string;
  userName: string;
  amount: number;
  type: TransactionType;
  transactionDate: Date | string;
  reason: string;
}

export interface AddFinancialTransaction {
  userId: string;
  amount: number;
  type: TransactionType;
  transactionDate: Date | string;
  reason?: string;
}

export interface MonthlyPayrollReport {
  userId: string;
  userName: string;
  salaryType: SalaryType;
  baseSalary: number;
  
  numberOfGroups: number;
  delayIncidents: number;
  absences: number;
  substitutions: number;

  automaticDeductions: number;
  automaticAdditions: number;
  manualDeductions: number;
  manualAdditions: number;

  netSalary: number;
}

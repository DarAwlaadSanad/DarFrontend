export interface CenterExpense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string | Date;
  notes?: string;
}

export interface CenterIncome {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string | Date;
  notes?: string;
}

export interface MonthlyFinancialSummary {
  month: number;
  year: number;
  totalStudentFees: number;
  totalOtherIncomes: number;
  totalIncomes: number;
  totalSalaries: number;
  totalCenterExpenses: number;
  totalOutgoings: number;
  netIncome: number;
  expensesBreakdown: CenterExpense[];
  incomesBreakdown: CenterIncome[];
}

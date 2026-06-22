export interface StudentFeeViewDTO {
  id: number;
  studentId: number;
  studentName: string;
  requiredAmount: number;
  amountPaid: number;
  month: number;
  year: number;
  paymentDate?: string;
  isExempted?: boolean;
  exemptionReason?: string;
}

export interface UpdateStudentFeePaymentDTO {
  amountPaid: number;
  paymentDate?: string;
}

export interface ExemptStudentFeeDTO {
  reason: string;
}

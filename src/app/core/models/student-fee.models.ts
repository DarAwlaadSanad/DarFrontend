export interface StudentFeeViewDTO {
  id: number;
  studentId: number;
  studentName: string;
  gender?: number | null;
  groupId: number;
  groupName: string;
  requiredAmount: number;
  amountPaid: number;
  month: number;
  year: number;
  paymentDate?: string;
  isExempted?: boolean;
  exemptionReason?: string;
  isPermanentlyExempted?: boolean;
}

export interface UpdateStudentFeePaymentDTO {
  amountPaid: number;
  paymentDate?: string;
}

export interface ExemptStudentFeeDTO {
  reason: string;
}

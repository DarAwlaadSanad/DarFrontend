export interface StudentFeeViewDTO {
  id: number;
  studentId: number;
  studentName: string;
  requiredAmount: number;
  amountPaid: number;
  month: number;
  year: number;
  paymentDate?: string;
}

export interface UpdateStudentFeePaymentDTO {
  amountPaid: number;
  paymentDate?: string;
}

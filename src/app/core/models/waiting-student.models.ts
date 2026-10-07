export enum WaitingStudentStatus {
  Pending = 0,   // قيد الانتظار
  Accepted = 1,  // تم القبول والتسكين
  Rejected = 2   // مرفوض
}

export interface WaitingStudentViewDTO {
  id: number;
  fullName: string;
  ssn?: string;
  gender: number; // 1: Male, 2: Female
  genderLabel?: string;
  academicYearId?: number;
  academicYearName?: string;
  phoneNumber: string;
  phoneDescription?: string;
  personalPhotoUrl?: string;
  documentUrl?: string;
  documentBackUrl?: string;
  notes?: string;
  status: WaitingStudentStatus;
  statusLabel?: string;
  createdAt: string;
  acceptedStudentId?: number;
  acceptedStudentCode?: string;
}

export interface WaitingStudentAddDTO {
  fullName: string;
  ssn?: string;
  gender: number;
  academicYearId?: number;
  phoneNumber: string;
  phoneDescription?: string;
  notes?: string;
  personalPhotoFile?: File;
  documentFile?: File;
  documentBackFile?: File;
}

export interface WaitingStudentStatusUpdateDTO {
  status: WaitingStudentStatus;
  notes?: string;
}

export interface AcceptWaitingStudentDTO {
  groupId?: number;
  notes?: string;
}

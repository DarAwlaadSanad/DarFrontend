export interface ImageViewDTO {
  id: number;
  url: string;
}

export interface PhoneViewDTO {
  id: number;
  number: string;
}

export interface StudentDetailsDTO {
  id: number;
  fullName: string;
  ssn?: string;
  notes?: string;
  images: ImageViewDTO[];
  phones: PhoneViewDTO[];
  level?: string;
  group?: string;
  joiningDate?: string;
}

export interface StudentAddDTO {
  fullName: string;
  ssn?: string;
  notes?: string;
  groupIds: number[];
  imageFiles?: File[];
  phoneNumbers: string[];
}

export interface StudentUpdateDTO {
  fullName: string;
  ssn?: string;
  notes?: string;
}

export interface AttendanceRecord {
  id?: number;
  studentId: number;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
}

export interface AbsenceReport {
  studentId: string;
  studentName: string;
  absenceCount: number;
  dates: Date[];
}

export type Student = StudentDetailsDTO;

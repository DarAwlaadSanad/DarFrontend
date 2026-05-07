export interface ImageViewDTO {
  id: number;
  url: string;
}

export interface PhoneViewDTO {
  id: number;
  number: string;
}

export interface MemorizationRecordDTO {
  id: number;
  studentId: number;
  studentName: string;
  fromSurahId: number;
  fromAyah: number;
  toSurahId: number;
  toAyah: number;
  date: string;
  notes?: string;
}

import { AcademicYearViewDTO } from './academic-year.models';
import { GroupCardDTO } from './group.models';

export interface StudentDetailsDTO {
  id: number;
  fullName: string;
  ssn?: string;
  isActive: boolean;
  code: string;
  notes?: string;
  academicYear: AcademicYearViewDTO;
  memorizationRecords: MemorizationRecordDTO[];
  groups: GroupCardDTO[];
  phones: PhoneViewDTO[];
  images: ImageViewDTO[];
}

export interface StudentAddDTO {
  fullName: string;
  ssn?: string;
  notes?: string;
  academicYearId: number;
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

export interface StudentPagedResultDTO {
  items: StudentDetailsDTO[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AbsenceReport {
  studentId: string;
  studentName: string;
  absenceCount: number;
  dates: Date[];
}

export type Student = StudentDetailsDTO;

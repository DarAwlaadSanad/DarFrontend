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

export enum Gender {
  Male = 1,
  Female = 2
}

export function normalizeGender(gender?: any): Gender | null {
  if (gender === null || gender === undefined || gender === '') return null;
  if (typeof gender === 'number') {
    if (gender === 1) return Gender.Male;
    if (gender === 2) return Gender.Female;
    return null;
  }
  const str = String(gender).trim().toLowerCase();
  if (str === '1' || str === 'male' || str === 'ذكر') return Gender.Male;
  if (str === '2' || str === 'female' || str === 'أنثى' || str === 'انثى') return Gender.Female;
  return null;
}

export function isMale(gender?: any): boolean {
  return normalizeGender(gender) === Gender.Male;
}

export function isFemale(gender?: any): boolean {
  return normalizeGender(gender) === Gender.Female;
}

export function getGenderLabel(gender?: any): string {
  const g = normalizeGender(gender);
  if (g === Gender.Male) return 'ذكر';
  if (g === Gender.Female) return 'أنثى';
  return 'غير محدد';
}

export interface StudentDetailsDTO {
  id: number;
  fullName: string;
  ssn: string;
  isActive: boolean;
  code: string;
  notes?: string;
  gender?: Gender | number | null;
  academicYear: AcademicYearViewDTO;
  memorizationRecords: MemorizationRecordDTO[];
  groups: GroupCardDTO[];
  phones: PhoneViewDTO[];
  images: ImageViewDTO[];
}

export interface StudentAddDTO {
  fullName: string;
  ssn: string;
  notes?: string;
  gender?: Gender | number | null;
  academicYearId: number;
  groupIds: number[];
  imageFiles?: File[];
  phoneNumbers: string[];
}

export interface StudentUpdateDTO {
  fullName: string;
  ssn: string;
  notes?: string;
  gender?: Gender | number | null;
  academicYearId?: number;
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
  maleCount: number;
  femaleCount: number;
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

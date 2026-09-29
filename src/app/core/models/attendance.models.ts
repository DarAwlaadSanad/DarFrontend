import { AttendanceStatus } from './group.models';

export interface AttendanceEntryDTO {
  studentId: number;
  status: AttendanceStatus;
  notes?: string;
}

export interface AttendanceBatchDTO {
  sessionId: number;
  entries: AttendanceEntryDTO[];
}

export interface AttendanceRecordDTO {
  sessionId: number;
  studentId: number;
  status: AttendanceStatus;
  notes?: string;
  score?: number;
  comment?: string;

  // سجل الحفظ والمراجعة
  hasMemorization?: boolean;
  fromSurahId?: number;
  fromAyah?: number;
  toSurahId?: number;
  toAyah?: number;
  nearRevision?: string;
  distantRevision?: string;
  memorizationNotes?: string;
}



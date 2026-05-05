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

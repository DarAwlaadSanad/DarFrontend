export enum AttendanceStatus {
  Present = 1,
  Absent = 2,
  Excused = 3,
  Late = 4
}

export function normalizeAttendanceStatus(status: any): AttendanceStatus | null {
  if (status === null || status === undefined || status === '') return null;
  if (typeof status === 'number') {
    if (status >= 1 && status <= 4) return status as AttendanceStatus;
    return null;
  }
  const str = String(status).trim().toLowerCase();
  switch (str) {
    case '1':
    case 'present':
      return AttendanceStatus.Present;
    case '2':
    case 'absent':
      return AttendanceStatus.Absent;
    case '3':
    case 'excused':
      return AttendanceStatus.Excused;
    case '4':
    case 'late':
      return AttendanceStatus.Late;
    default:
      return null;
  }
}

export interface SessionRecordDTO {
  attendance?: AttendanceStatus;
  score?: number;
  comment?: string;
}

export interface SessionViewDTO {
  sessionId: number;
  date: string; // DateOnly as string
  startTime: string; // TimeSpan as string
}

export interface StudentInGroupDTO {
  studentId: number;
  studentName: string;
  gender?: number | null;
  records: { [key: number]: SessionRecordDTO };
  totalPresent: number;
  totalEvaluation: number;
}

export interface GroupDetailsDTO {
  groupId: number;
  groupName: string;
  description?: string;
  teacherId?: string;
  teacherName?: string;
  month: number;
  year: number;
  isOnline: boolean;
  roomId?: number;
  roomName?: string;
  maleCount?: number;
  femaleCount?: number;
  sessions: SessionViewDTO[];
  students: StudentInGroupDTO[];
}

export interface GroupCardDTO {
  id: number;
  name: string;
  description?: string;
  teacherId?: string;
  teacherName?: string;
  studentCount: number;
  maleCount?: number;
  femaleCount?: number;
  isOnline: boolean;
  roomId?: number;
  roomName?: string;
}

export interface GroupAddDTO {
  name: string;
  description?: string;
  teacherId: string;
  isOnline: boolean;
  roomId?: number;
}

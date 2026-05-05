export enum AttendanceStatus {
  Present = 1,
  Absent = 2,
  Excused = 3,
  Late = 4
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
  records: { [key: number]: SessionRecordDTO };
  totalPresent: number;
}

export interface GroupDetailsDTO {
  groupId: number;
  groupName: string;
  description?: string;
  teacherId?: string;
  teacherName?: string;
  month: number;
  year: number;
  sessions: SessionViewDTO[];
  students: StudentInGroupDTO[];
}

export interface GroupCardDTO {
  id: number;
  name: string;
  description?: string;
  teacherName?: string;
  studentCount: number;
}

export interface GroupAddDTO {
  name: string;
  description?: string;
  teacherId: string;
}

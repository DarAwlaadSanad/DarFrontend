export interface TeacherAttendanceRecordDTO {
  id?: number;
  teacherId: string;
  date: string; // ISO Date String
  checkInTime: string | null;
  checkOutTime: string | null;
  delayMinutes: number;
  isAbsent: boolean;
  absenceReason?: string | null;
}

export interface TeacherAttendanceHistoryItemDTO {
  id: number;
  teacherId: string;
  teacherName: string;
  phoneNumber?: string | null;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  delayMinutes: number;
  isAbsent: boolean;
  absenceReason?: string | null;
  sessionsCount: number;
  substituteTeacherNames?: string | null;
}

export interface TeacherAttendancePagedResultDTO {
  items: TeacherAttendanceHistoryItemDTO[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalAbsences: number;
  totalLateMinutes: number;
}

export interface TeacherAttendanceFilterParams {
  page?: number;
  pageSize?: number;
  teacherId?: string;
  fromDate?: string;
  toDate?: string;
  isAbsent?: boolean | null;
  hasDelay?: boolean | null;
  search?: string;
}

export interface MarkTeacherAbsentDTO {
  teacherId: string;
  date: string;
  reason?: string;
}

export interface AssignSubstituteDTO {
  sessionId: number;
  substituteTeacherId: string;
}

export interface CheckInResponseDTO {
  success: boolean;
  message?: string;
  delayMinutes: number;
  record: TeacherAttendanceRecordDTO;
}

export interface CheckOutResponseDTO {
  success: boolean;
  message?: string;
  record: TeacherAttendanceRecordDTO;
}

export interface TeacherPeriodDTO {
  periodNumber: number;
  startTime: string;
  endTime: string;
  sessionsCount: number;
  status?: string; // 'Completed' | 'Active' | 'Upcoming' | 'Passed' | 'Absent'
}

export interface TodayAttendanceStatusDTO {
  hasSessionsToday: boolean;
  requiresSessions: boolean;
  canCheckIn: boolean;
  isCheckInOpen?: boolean;
  allowedCheckInTime?: string | null;
  secondsUntilCheckIn?: number | null;
  message?: string | null;
  record?: TeacherAttendanceRecordDTO | null;
  sessionsCount: number;
  periods?: TeacherPeriodDTO[];
  allTodayRecords?: TeacherAttendanceRecordDTO[];
  currentPeriodNumber?: number;
}


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

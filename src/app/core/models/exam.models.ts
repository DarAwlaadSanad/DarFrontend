export interface ExamDTO {
  id: number;
  title: string;
  date: string;
  maxScore: number;
  groupId: number;
  notes?: string;
}

export interface CreateExamDTO {
  title: string;
  date: string;
  maxScore: number;
  groupId: number;
  notes?: string;
}

export interface ExamResultDTO {
  id: number;
  examId: number;
  studentId: number;
  studentName: string;
  examTitle?: string;
  examDate?: string;
  maxScore?: number;
  score?: number;
  notes?: string;
}

export interface SaveExamResultsDTO {
  results: UpdateExamResultDTO[];
}

export interface UpdateExamResultDTO {
  studentId: number;
  score?: number;
  notes?: string;
}

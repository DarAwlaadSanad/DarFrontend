export interface EvaluationEntryDTO {
  studentId: number;
  score?: number;
  comment?: string;
}

export interface EvaluationBatchDTO {
  sessionId: number;
  entries: EvaluationEntryDTO[];
}

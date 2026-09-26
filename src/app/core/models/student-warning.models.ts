export enum WarningType {
  Absence = 1,      // غياب
  Misbehavior = 2,  // شغب
  NotMemorized = 3, // عدم حفظ
  Other = 4         // أخرى
}

export interface StudentWarningCreateDTO {
  studentId: number;
  warningType: WarningType;
  date: string;
  reason?: string;
  groupId?: number | null;
}

export interface StudentWarningUpdateDTO {
  warningType: WarningType;
  date: string;
  reason?: string;
  groupId?: number | null;
}

export interface StudentWarningViewDTO {
  id: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  warningType: WarningType;
  warningTypeName: string;
  date: string;
  reason?: string;
  groupId?: number | null;
  groupName?: string;
  createdByUserId?: string;
  createdByName?: string;
  createdAt: string;
}

export interface StudentWarningSummaryDTO {
  totalCount: number;
  absenceCount: number;
  misbehaviorCount: number;
  notMemorizedCount: number;
  otherCount: number;
}

export interface StudentWarningPagedResultDTO {
  items: StudentWarningViewDTO[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function normalizeWarningType(type: any): WarningType | null {
  if (type === null || type === undefined) return null;

  if (typeof type === 'number') {
    return type as WarningType;
  }

  const str = String(type).trim().toLowerCase();

  if (str === '1' || str === 'absence' || str.includes('غياب')) {
    return WarningType.Absence;
  }
  if (str === '2' || str === 'misbehavior' || str.includes('شغب')) {
    return WarningType.Misbehavior;
  }
  if (str === '3' || str === 'notmemorized' || str.includes('حفظ')) {
    return WarningType.NotMemorized;
  }
  if (str === '4' || str === 'other' || str.includes('أخرى') || str.includes('اخرى')) {
    return WarningType.Other;
  }

  const num = Number(str);
  if (!isNaN(num) && num >= 1 && num <= 4) {
    return num as WarningType;
  }

  return null;
}

export function getWarningTypeLabel(type: any): string {
  const norm = normalizeWarningType(type);
  switch (norm) {
    case WarningType.Absence:
      return 'إنذار غياب';
    case WarningType.Misbehavior:
      return 'إنذار شغب';
    case WarningType.NotMemorized:
      return 'إنذار عدم حفظ';
    case WarningType.Other:
      return 'إنذار آخر';
    default:
      return 'إنذار';
  }
}

export function getWarningTypeBadgeClass(type: any): string {
  const norm = normalizeWarningType(type);
  switch (norm) {
    case WarningType.Absence:
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    case WarningType.Misbehavior:
      return 'bg-red-500/10 text-red-400 border border-red-500/30';
    case WarningType.NotMemorized:
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
    case WarningType.Other:
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
    default:
      return 'bg-dark-800 text-dark-400 border border-dark-700';
  }
}

export function getWarningTypeDotClass(type: any): string {
  const norm = normalizeWarningType(type);
  switch (norm) {
    case WarningType.Absence:
      return 'bg-amber-400';
    case WarningType.Misbehavior:
      return 'bg-red-400';
    case WarningType.NotMemorized:
      return 'bg-purple-400';
    case WarningType.Other:
      return 'bg-blue-400';
    default:
      return 'bg-dark-400';
  }
}

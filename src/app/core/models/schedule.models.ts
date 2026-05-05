export enum DayOfWeekAr {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
}

export interface GroupScheduleViewDTO {
  id: number;
  groupId: number;
  dayOfWeek: DayOfWeekAr;
  startTime: string; // TimeSpan as string
  endTime: string;   // TimeSpan as string
  effectiveFrom: string; // DateOnly as string
  effectiveTo?: string;  // DateOnly as string
  isActive: boolean;
}

export interface CreateGroupScheduleDTO {
  groupId: number;
  dayOfWeek: DayOfWeekAr;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
}

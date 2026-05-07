export interface FeePlanViewDTO {
  id: number;
  groupId: number;
  amount: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface FeePlanAddDTO {
  groupId: number;
  amount: number;
  effectiveFrom: string;
}

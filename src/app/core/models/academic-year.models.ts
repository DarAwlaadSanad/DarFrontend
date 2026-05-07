export enum TypeSchool {
  Public = 0,
  Azhar = 1,
  Another = 2
}

export interface AcademicYearViewDTO {
  id: number;
  name: string;
  typeSchool: TypeSchool;
}

export interface AcademicYearAddDTO {
  name: string;
  typeSchool: TypeSchool;
}

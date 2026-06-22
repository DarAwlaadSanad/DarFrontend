export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface RoleAddDTO {
  name: string;
  permissions: string[];
}

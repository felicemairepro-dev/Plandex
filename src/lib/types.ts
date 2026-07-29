export type UserRole = "admin" | "extra";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
}

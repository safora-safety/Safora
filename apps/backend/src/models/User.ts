import { UserRole } from "@safora/shared-types";

export interface UserRow {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  blood_group?: string | null;
  emergency_notes?: string | null;
  password?: string;
  role: UserRole;
  created_at: Date | string;
}

export interface UserEntity {
  id: number;
  name: string;
  email: string;
  phone?: string;
  bloodGroup?: string;
  emergencyNotes?: string;
  role: UserRole;
  createdAt: string;
}

export class UserModel {
  static fromRow(row: UserRow): UserEntity {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      bloodGroup: row.blood_group || undefined,
      emergencyNotes: row.emergency_notes || undefined,
      role: row.role || "user",
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }
}

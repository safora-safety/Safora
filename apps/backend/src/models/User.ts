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
  is_active?: boolean;
  age?: number | null;
  age_notice_ack?: boolean | null;
  terms_accepted_at?: Date | string | null;
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
  isActive?: boolean;
  age?: number | null;
  ageNoticeAck?: boolean;
  termsAcceptedAt?: string | null;
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
      isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
      age: row.age != null ? Number(row.age) : undefined,
      ageNoticeAck: Boolean(row.age_notice_ack),
      termsAcceptedAt:
        row.terms_accepted_at instanceof Date
          ? row.terms_accepted_at.toISOString()
          : row.terms_accepted_at != null
            ? String(row.terms_accepted_at)
            : undefined,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }
}

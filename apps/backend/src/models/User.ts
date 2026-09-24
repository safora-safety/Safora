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
  age_notice_ack?: boolean;
  termsAcceptedAt?: string | null;
  terms_accepted_at?: string | null;
  createdAt: string;
}

export class UserModel {
  static fromRow(row: UserRow): UserEntity {
    const termsAt =
      row.terms_accepted_at instanceof Date
        ? row.terms_accepted_at.toISOString()
        : row.terms_accepted_at != null
          ? String(row.terms_accepted_at)
          : undefined;
    const ageAck = Boolean(row.age_notice_ack);

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
      ageNoticeAck: ageAck,
      age_notice_ack: ageAck,
      termsAcceptedAt: termsAt,
      terms_accepted_at: termsAt,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }
}

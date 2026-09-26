export interface TrustedContactRow {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  email?: string | null;
  relationship?: string | null;
  status?: string | null;
  guardian_user_id?: number | null;
  created_at: Date | string;
}

export interface TrustedContactEntity {
  id: number;
  userId: number;
  name: string;
  phone: string;
  email?: string;
  hasSaforaAccount?: boolean;
  status?: "pending" | "accepted" | "declined";
  guardianUserId?: number | null;
  relationship?: string;
  createdAt: string;
}

export class TrustedContactModel {
  static fromRow(
    row: TrustedContactRow,
    hasSaforaAccount?: boolean,
  ): TrustedContactEntity {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      phone: row.phone,
      email: row.email || undefined,
      hasSaforaAccount:
        hasSaforaAccount ?? Boolean(row.guardian_user_id || row.email),
      status: (row.status as any) || "accepted",
      guardianUserId: row.guardian_user_id || undefined,
      relationship: row.relationship || undefined,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }
}

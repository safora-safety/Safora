import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { AppError } from "../errors/AppError";
import { User } from "@safora/shared-types";
import { UserRepository } from "../repositories/userRepository";
import { UserModel } from "../models/User";

import { db } from "../config/database";

const JWT_SECRET: string = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is missing.");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const GOOGLE_CLIENT_IDS = (
  process.env.GOOGLE_CLIENT_IDS ||
  process.env.GOOGLE_CLIENT_ID ||
  "586932371847-8kr8epdn0u64jdma6e6s8is1hdodv5pt.apps.googleusercontent.com"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const GOOGLE_CLIENT_ID = GOOGLE_CLIENT_IDS[0];
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export class AuthService {
  static async loginWithGoogle(
    idToken: string,
  ): Promise<{ user: User; token: string }> {
    if (!idToken || !idToken.trim()) {
      throw new AppError("Google ID token is required", 400);
    }

    let payload:
      | {
          sub: string;
          email?: string;
          name?: string;
          picture?: string;
          email_verified?: boolean;
        }
      | undefined;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: idToken.trim(),
        audience:
          GOOGLE_CLIENT_IDS.length > 1 ? GOOGLE_CLIENT_IDS : GOOGLE_CLIENT_ID,
      });
      const googlePayload = ticket.getPayload();
      if (!googlePayload) {
        throw new AppError("Invalid Google token payload", 401);
      }
      payload = {
        sub: googlePayload.sub,
        email: googlePayload.email,
        name: googlePayload.name,
        picture: googlePayload.picture,
        email_verified: googlePayload.email_verified,
      };
    } catch (err: unknown) {
      // Fallback: tokeninfo endpoint check
      try {
        const response = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`,
        );
        if (!response.ok) {
          throw new Error("Tokeninfo returned non-200");
        }
        const data = (await response.json()) as any;
        if (data.error_description || !data.sub || !data.email) {
          throw new Error(
            data.error_description || "Invalid tokeninfo response",
          );
        }

        // Audience validation: Ensure token was issued specifically for Safora
        if (!data.aud || !GOOGLE_CLIENT_IDS.includes(data.aud)) {
          throw new Error("Token was not issued for this application");
        }

        payload = {
          sub: data.sub,
          email: data.email,
          name: data.name,
          picture: data.picture,
          email_verified:
            data.email_verified === "true" || data.email_verified === true,
        };
      } catch (fallbackErr: unknown) {
        const msg =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : err instanceof Error
              ? err.message
              : String(err);
        throw new AppError(`Google authentication failed: ${msg}`, 401);
      }
    }

    if (!payload?.email) {
      throw new AppError(
        "Google account does not provide an email address",
        400,
      );
    }

    // Require verified email: Prevent account takeover or linking unverified accounts
    if (payload.email_verified !== true) {
      throw new AppError("Google account email is not verified", 401);
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name?.trim() || email.split("@")[0] || "Safora User";
    const googleId = payload.sub;
    const avatarUrl = payload.picture;

    // Check if user already exists by email
    let row = await UserRepository.findByEmail(email);

    if (row) {
      // User exists: link Google credentials if not present
      const updates: {
        google_id?: string;
        avatar_url?: string;
        auth_provider?: string;
      } = {};
      if (!row.google_id) updates.google_id = googleId;
      if (!row.avatar_url && avatarUrl) updates.avatar_url = avatarUrl;
      if (!row.auth_provider || row.auth_provider === "local") {
        updates.auth_provider = "google";
      }

      if (Object.keys(updates).length > 0) {
        const updatedRow = await UserRepository.updateUser(row.id, updates);
        if (updatedRow) row = updatedRow;
      }
    } else {
      // Create new user via Google Sign-In (Option B: direct login, phone optional)
      row = await UserRepository.createGoogleUser({
        name,
        email,
        googleId,
        avatarUrl,
      });
    }

    const user = UserModel.fromRow(row);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any },
    );

    return { user, token };
  }

  static async register(userData: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<{ user: User; token: string }> {
    const email = userData.email.toLowerCase().trim();

    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw new AppError("An account with this email already exists", 409);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const row = await UserRepository.createUser({
      name: userData.name,
      email,
      phone: userData.phone,
      passwordHash: hashedPassword,
    });

    const user = UserModel.fromRow(row);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any },
    );

    return { user, token };
  }

  static async login(
    emailInput: string,
    passwordInput: string,
  ): Promise<{ user: User; token: string }> {
    const email = emailInput.toLowerCase().trim();

    const row = await UserRepository.findByEmail(email);
    if (!row || !row.password) {
      throw new AppError("Invalid email or password", 401);
    }

    const isMatch = await bcrypt.compare(passwordInput, row.password);
    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const user = UserModel.fromRow(row);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any },
    );

    return { user, token };
  }

  static async getUserProfile(userId: string | number): Promise<User> {
    const row = await UserRepository.findById(userId);
    if (!row) {
      throw new AppError("User not found", 404);
    }
    return UserModel.fromRow(row);
  }

  static async updateUserProfile(
    userId: string | number,
    data: {
      name?: string;
      email?: string;
      phone?: string | null;
      blood_group?: string | null;
      emergency_notes?: string | null;
      age?: number | null;
      age_notice_ack?: boolean | null;
      ageNoticeAck?: boolean | null;
      terms_accepted_at?: string | null;
      termsAcceptedAt?: string | null;
    },
  ): Promise<User> {
    if (data.email) {
      const email = data.email.toLowerCase().trim();
      const existing = await UserRepository.findByEmail(email);
      if (existing && String(existing.id) !== String(userId)) {
        throw new AppError(
          "Another account already uses this email address",
          409,
        );
      }
    }

    const payload: Parameters<typeof UserRepository.updateUser>[1] = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      blood_group: data.blood_group,
      emergency_notes: data.emergency_notes,
      age: data.age,
      age_notice_ack:
        data.ageNoticeAck !== undefined
          ? data.ageNoticeAck
          : data.age_notice_ack,
      terms_accepted_at:
        data.termsAcceptedAt !== undefined
          ? data.termsAcceptedAt
          : data.terms_accepted_at,
    };

    const updatedRow = await UserRepository.updateUser(userId, payload);
    if (!updatedRow) {
      throw new AppError("User not found", 404);
    }

    return UserModel.fromRow(updatedRow);
  }

  static async changePassword(
    userId: string | number,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new AppError(
        "New password must be at least 8 characters long",
        400,
      );
    }

    const userRow = await db.query(
      "SELECT id, password FROM users WHERE id = $1 LIMIT 1;",
      [userId],
    );
    if (userRow.rows.length === 0 || !userRow.rows[0].password) {
      throw new AppError("User password record not found", 404);
    }

    const isMatch = await bcrypt.compare(oldPassword, userRow.rows[0].password);
    if (!isMatch) {
      throw new AppError("Incorrect current password", 401);
    }

    const salt = await bcrypt.genSalt(10);
    const newHashed = await bcrypt.hash(newPassword, salt);

    await db.query("UPDATE users SET password = $1 WHERE id = $2;", [
      newHashed,
      userId,
    ]);
  }
}

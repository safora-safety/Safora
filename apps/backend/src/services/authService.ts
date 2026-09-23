import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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

export class AuthService {
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

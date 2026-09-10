import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError";
import { User } from "@safora/shared-types";
import { UserRepository } from "../repositories/userRepository";
import { UserModel } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "safora_jwt_secret_fallback_key";
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

    const updatedRow = await UserRepository.updateUser(userId, data);
    if (!updatedRow) {
      throw new AppError("User not found", 404);
    }

    return UserModel.fromRow(updatedRow);
  }
}

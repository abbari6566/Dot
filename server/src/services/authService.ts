import prisma from "../utils/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const registerUser = async (
  email: string,
  name: string,
  password: string,
) => {
  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already in use");
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 12);

  //Create the user in the database
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  //Strip passwordHash before returning
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
};
/*
Access Token  → lives 15 minutes, sent with every API request
Refresh Token → lives 7 days, only used to get a new access token
*/
export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
};

export const loginUser = async (email: string, password: string) => {
  //find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Invalid credentials");
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }
  return generateTokens(user.id);
};

export const updateDailyGoal = async (userId: string, dailyGoal: number) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { dailyGoal },
  });
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
};

export const updateProfile = async (userId: string, data: { name?: string; email?: string }) => {
  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== userId) throw new Error("Email already in use");
  }
  const user = await prisma.user.update({ where: { id: userId }, data });
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect");
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
};

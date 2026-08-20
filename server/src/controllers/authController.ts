import {
  registerUser,
  loginUser,
  getUserById,
  generateTokens,
  updateDailyGoal,
  updateProfile,
  changePassword,
} from "../services/authService.js";
import { Request, Response } from "express";
import { registerSchema, loginSchema, dailyGoalSchema, profileUpdateSchema, passwordChangeSchema } from "../utils/validators.js";
import jwt from "jsonwebtoken";

export const register = async (req: Request, res: Response) => {
  try {
    const validated = registerSchema.safeParse(req.body);

    if (!validated.success) {
      res.status(400).json({ message: validated.error.flatten().fieldErrors });
      return;
    }

    const { email, name, password } = validated.data;

    const result = await registerUser(email, name, password);

    res.status(201).json({ user: result });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Email already in use") {
        res.status(400).json({ message: "The email is already in use" });
      } else {
        console.error(error.message);
        res.status(500).json({ message: "Internal server error" });
      }
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validated = loginSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ message: validated.error.flatten().fieldErrors });
      return;
    }
    const { email, password } = validated.data;
    const loggedIn = await loginUser(email, password);
    res.cookie("refreshToken", loggedIn.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });
    res.status(200).json({ accessToken: loggedIn.accessToken });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid credentials") {
        res.status(401).json({ message: "Invalid email or password" });
      } else {
        console.error(error.message);
        res.status(500).json({ message: "Internal server error" });
      }
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    // read the refresh token from the HTTP-only cookie
    const token = req.cookies.refreshToken;
    // if no cookie exists, the user isn't logged in
    if (!token) {
      res.status(401).json({ message: "No refresh token" });
      return;
    }
    // verify the token — throws if expired or tampered with
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
      userId: string;
    };
    //issue a brand new pair of tokens (rotation)
    const tokens = generateTokens(payload.userId);
    // set the new refresh token as a cookie — replaces the old one
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    //send the new access token to the client
    res.status(200).json({ accessToken: tokens.accessToken });
  } catch (error) {
    //jwt.verify throws here if token is expired or invalid
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ message: "Logged out successfully" });
};

export const me = async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.userId!);
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({ message: "User not found" });
    } else {
      console.error(error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

export const updateGoal = async (req: Request, res: Response) => {
  try {
    const validated = dailyGoalSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ message: validated.error.flatten().fieldErrors });
      return;
    }
    const user = await updateDailyGoal(req.userId!, validated.data.dailyGoal);
    res.status(200).json({ user });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfileHandler = async (req: Request, res: Response) => {
  try {
    const validated = profileUpdateSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ message: validated.error.flatten().fieldErrors });
      return;
    }
    const user = await updateProfile(req.userId!, validated.data);
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "Email already in use") {
      res.status(409).json({ message: error.message });
      return;
    }
    console.error(error instanceof Error ? error.message : error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changePasswordHandler = async (req: Request, res: Response) => {
  try {
    const validated = passwordChangeSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ message: validated.error.flatten().fieldErrors });
      return;
    }
    await changePassword(req.userId!, validated.data.currentPassword, validated.data.newPassword);
    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    if (error instanceof Error && error.message === "Current password is incorrect") {
      res.status(401).json({ message: error.message });
      return;
    }
    console.error(error instanceof Error ? error.message : error);
    res.status(500).json({ message: "Internal server error" });
  }
};

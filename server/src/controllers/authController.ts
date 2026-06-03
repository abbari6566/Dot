import {
  registerUser,
  loginUser,
  generateTokens,
} from "../services/authService.js";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;
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
    const { email, password } = req.body;
    const loggedIn = await loginUser(email, password);
    res.cookie("refreshToken", loggedIn.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
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
      secure: true,
      sameSite: "strict",
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
    secure: true,
    sameSite: "strict",
  });
  res.status(200).json({ message: "Logged out successfully" });
};

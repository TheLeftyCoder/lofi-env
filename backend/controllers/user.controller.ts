import { Request, Response } from "express";
import { ObjectId } from "mongoose";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import brcrypt from "bcrypt";
import { UserAuthInfoRequest } from "../types";
import User from "../models/user.model";

// Function to generate JWT
const generateToken = (id: ObjectId) =>
  jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: "30d" });

// @desc    Get current user data
// @route   GET /api/users/me
// @access  Private
const getCurrentUser = asyncHandler(
  async (req: UserAuthInfoRequest, res: Response) => {
    const { _id, name, email } = await User.findById(req.user.id);
    res.status(200).json({
      id: _id,
      name,
      email,
    });
  }
);

// @desc    Create new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req: Request, res: Response) => {
  // Check existence of all field inputs
  const { email, name, password } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please add all fields");
  }

  // Check user existence
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  // Hash password
  const salt = await brcrypt.genSalt(10);
  const hashedPassword = await brcrypt.hash(password, salt);

  // Create user
  const user = await User.create({ email, name, password: hashedPassword });

  // Send response
  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  // If user exists and password matches
  if (user && (await brcrypt.compare(password, user.password))) {
    res.status(200).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      /* eslint no-underscore-dangle: 0 */
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid credentials");
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(400);
    throw new Error("User not found");
  }
  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.status(200).json(updatedUser);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(400);
    throw new Error("User not found");
  }
  const deletedUser = await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ id: req.params.id });
});

export default {
  getCurrentUser,
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
};

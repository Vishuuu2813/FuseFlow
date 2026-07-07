import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_whatsflow_2026';

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, companyName } = req.body;

    if (!name || !email || !password || !companyName) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // 1. Create Tenant (Workspace)
    const newTenant = await Tenant.create({
      name: companyName,
      status: 'trial',
      plan: 'trial',
      limits: {
        maxDevices: 1,
        maxMessagesPerMonth: 500,
        maxAiCredits: 50,
        maxStorageMb: 100,
      },
    });

    // 2. Create Administrator User
    const newUser = await User.create({
      name,
      email,
      passwordHash: password, // Pre-save hook hashes this
      role: 'Admin',
      tenantId: newTenant._id,
      isEmailVerified: false,
    });

    // 3. Issue Tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Save refresh token to user model
    newUser.refreshToken = refreshToken;
    await newUser.save();

    // Set refresh token in HttpOnly Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'Signup successful.',
      accessToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive user.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Issue Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Login successful.',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided.' });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.refreshToken !== refreshToken || !user.isActive) {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (error) {
    return res.status(401).json({ message: 'Session expired. Log in again.' });
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(decoded.userId, { $unset: { refreshToken: 1 } });
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out.' });
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const tenant = await Tenant.findById(user.tenantId);
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant,
    });
  } catch (error) {
    next(error);
  }
};

export const adminRegister = async (req, res, next) => {
  try {
    const { name, email, password, signupCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const envSignupCode = process.env.ADMIN_SIGNUP_CODE || 'whatsflow_admin_secret_2026';
    if (signupCode !== envSignupCode) {
      return res.status(400).json({ message: 'Invalid admin registration secret code.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const newUser = await User.create({
      name,
      email,
      passwordHash: password,
      role: 'Admin',
      tenantId: null,
      isEmailVerified: true
    });

    res.status(201).json({
      message: 'Admin registered successfully. Proceed to login.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive user.' });
    }

    if (user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. You do not have administrative privileges.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Admin login successful.',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }
    });
  } catch (error) {
    next(error);
  }
};


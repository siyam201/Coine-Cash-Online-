import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, pool } from "./db";
import { WebSocketServer } from "ws";
import { 
  insertUserSchema, loginUserSchema, verifyOtpSchema, 
  sendMoneySchema, resetPasswordSchema, updatePasswordSchema,
  updateProfileSchema, enable2FASchema, verify2FASchema, 
  disable2FASchema, use2FARecoverySchema, twoFactorLoginSchema,
  systemSettingsSchema, emailSettingsSchema, securitySettingsSchema,
  insertUserSettingSchema, insertUserDocumentSchema,
  apiKeyTransferSchema, createApiKeySchema, updateApiKeySchema
} from "@shared/schema";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import passport from "passport";
import { 
  sendVerificationEmail, sendPasswordResetEmail, 
  sendTransactionNotificationEmail, sendLowBalanceWarningEmail
} from "./email";
import { 
  generateSecret, generateQRCode, verifyToken, 
  generateRecoveryCodes, enable2FA, disable2FA, 
  verify2FALogin, useRecoveryCode 
} from "./two-factor";
import rateLimit from "express-rate-limit";
import { validateApiKey, checkApiKeyPermission } from "./api-auth";

// OTP generation utility
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Auth middleware
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    // Check if user is verified
    if (!req.user?.isVerified) {
      return res.status(403).json({ 
        message: "Email verification required", 
        verificationRequired: true 
      });
    }
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
  });
  
  // Database maintenance endpoint (admin only)
  app.post('/api/maintenance/vacuum', isAdmin, async (req, res, next) => {
    try {
      // Run the maintenance function
      await db.execute(`SELECT maintenance_db()`);
      
      // Get statistics about the database
      const dbStats = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users) AS user_count,
          (SELECT COUNT(*) FROM transactions) AS transaction_count,
          (SELECT COUNT(*) FROM otp_codes) AS otp_count,
          (SELECT COUNT(*) FROM user_settings) AS user_settings_count,
          (SELECT COUNT(*) FROM user_documents) AS user_documents_count,
          (SELECT COUNT(*) FROM pg_indexes WHERE tablename IN 
            ('users', 'transactions', 'otp_codes', 'user_settings', 'user_documents')
          ) AS index_count
      `);
      
      res.json({ 
        success: true, 
        message: 'Database maintenance completed successfully',
        stats: dbStats.rows[0],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error during database maintenance:', error);
      next(error);
    }
  });
  
  // TESTING ONLY: Get OTP codes for a specific email (for debugging)
  app.get('/api/debug/otp-codes', async (req, res) => {
    const { email, secret_key } = req.query;
    // Simple protection to ensure this endpoint isn't publicly accessible
    if (secret_key !== 'debug_mode_enabled') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    try {
      const codes = await storage.getOtpCodes(email as string);
      
      // Only return necessary information, not the full OTP objects
      const simplifiedCodes = codes.map(code => ({
        code: code.code,
        purpose: code.purpose,
        isUsed: code.isUsed,
        expiresAt: code.expiresAt,
        createdAt: code.createdAt
      }));
      
      res.json(simplifiedCodes);
    } catch (error) {
      console.error('Error fetching OTP codes:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Serve static HTML page for testing
  app.get('/static', (req, res) => {
    res.sendFile('static.html', { root: './client/src' });
  });

  // Set up authentication
  setupAuth(app);
  
  // Set up rate limiters
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 failed attempts per window
    message: { message: "Too many login attempts, please try again later" }
  });
  
  const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 OTP requests per hour
    message: { message: "Too many OTP requests, please try again later" }
  });
  
  // Auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Generate and send verification OTP
      const otp = generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry
      
      await storage.createOtpCode({
        userId: user.id,
        email: user.email,
        code: otp,
        purpose: "verification",
        expiresAt
      });
      
      await sendVerificationEmail(user.email, otp);
      
      // Login the user
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/login", loginLimiter, (req, res, next) => {
    try {
      loginUserSchema.parse(req.body);
      passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
        
        req.login(user, (err) => {
          if (err) return next(err);
          // Don't send password back to client
          const { password, ...userWithoutPassword } = user;
          res.status(200).json(userWithoutPassword);
        });
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Don't send password back to client
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  
  // Search users by email
  app.get("/api/users/search", isAuthenticated, async (req, res, next) => {
    try {
      const { email } = req.query;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email query parameter is required" });
      }
      
      // Get all users
      const users = await storage.getAllUsers();
      
      // Filter users by email containing the search term
      const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(email.toLowerCase()) && 
        user.isVerified && 
        !user.isBlocked &&
        user.id !== req.user.id // Don't include current user
      );
      
      // Return limited user information (only id, email and name)
      const safeUsers = filteredUsers.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name
      })).slice(0, 5); // Limit to 5 results
      
      res.json(safeUsers);
    } catch (error) {
      next(error);
    }
  });
  
  // OTP Verification route
  app.post("/api/verify-otp", async (req, res, next) => {
    try {
      const data = verifyOtpSchema.parse(req.body);
      
      // Log all verification attempts for debugging
      console.log(`[VERIFICATION] Verifying OTP for ${data.email}, code: ${data.code}, purpose: ${data.purpose}`);
      
      // For debugging - find all OTP codes for this email
      const allCodes = await storage.getOtpCodes(data.email);
      console.log(`[VERIFICATION] Found ${allCodes?.length || 0} OTP codes for ${data.email}`);
      if (allCodes && allCodes.length > 0) {
        console.log('[VERIFICATION] Available codes:', allCodes.map(c => ({
          id: c.id,
          code: c.code,
          purpose: c.purpose,
          used: c.used,
          expiresAt: c.expiresAt
        })));
      }
      
      const otpCode = await storage.getOtpCode(data.email, data.code, data.purpose);
      if (!otpCode) {
        console.log(`[VERIFICATION] No valid OTP found for ${data.email} with code ${data.code} and purpose ${data.purpose}`);
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
      
      console.log(`[VERIFICATION] Valid OTP found for ${data.email}, marking as used`);
      
      // Mark OTP as used
      await storage.markOtpAsUsed(otpCode.id);
      
      // If verification purpose, mark user as verified
      if (data.purpose === "verification" && otpCode.userId) {
        console.log(`[VERIFICATION] Marking user ${otpCode.userId} as verified`);
        await storage.updateUser(otpCode.userId, { isVerified: true });
        
        // If user is already logged in, update the session
        if (req.isAuthenticated() && req.user.email === data.email) {
          console.log(`[VERIFICATION] Updating session for user ${data.email}`);
          (req.user as any).isVerified = true;
        }
      }
      
      res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
      console.error('[VERIFICATION ERROR]', error);
      next(error);
    }
  });
  
  // Request new OTP route
  app.post("/api/request-otp", otpLimiter, async (req, res, next) => {
    try {
      const { email, purpose } = req.body;
      
      if (!email || !purpose) {
        return res.status(400).json({ message: "Email and purpose are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user && purpose !== "password-reset") {
        return res.status(404).json({ message: "User not found" });
      }
      
      const otp = generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry
      
      await storage.createOtpCode({
        userId: user?.id,
        email,
        code: otp,
        purpose,
        expiresAt
      });
      
      if (purpose === "verification") {
        await sendVerificationEmail(email, otp);
      } else if (purpose === "password-reset") {
        await sendPasswordResetEmail(email, otp);
      }
      
      res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
      next(error);
    }
  });
  
  // Password reset routes
  app.post("/api/forgot-password", otpLimiter, async (req, res, next) => {
    try {
      const data = resetPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        // Return success even if user doesn't exist for security reasons
        return res.status(200).json({ message: "If your email exists, you will receive password reset instructions" });
      }
      
      const otp = generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry
      
      await storage.createOtpCode({
        userId: user.id,
        email: user.email,
        code: otp,
        purpose: "password-reset",
        expiresAt
      });
      
      await sendPasswordResetEmail(user.email, otp);
      
      res.status(200).json({ message: "If your email exists, you will receive password reset instructions" });
    } catch (error) {
      next(error);
    }
  });
  
  // Request password reset (sends OTP)
  app.post("/api/request-reset-password", async (req, res, next) => {
    try {
      const data = resetPasswordSchema.parse(req.body);
      
      // Get user by email
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        // Still return success to prevent email enumeration
        return res.status(200).json({ message: "If your email is in our system, you will receive a password reset code" });
      }
      
      // Generate OTP
      const otp = generateOTP();
      
      // Calculate expiry (10 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      
      // Save OTP to database
      await storage.createOtpCode({
        email: data.email,
        code: otp,
        purpose: "password-reset",
        expiresAt,
        userId: user.id
      });
      
      // Send email with OTP
      await sendPasswordResetEmail(data.email, otp);
      
      res.status(200).json({ message: "If your email is in our system, you will receive a password reset code" });
    } catch (error) {
      next(error);
    }
  });

  // Complete password reset with OTP and new password
  app.post("/api/reset-password", async (req, res, next) => {
    try {
      const data = updatePasswordSchema.parse(req.body);
      
      const otpCode = await storage.getOtpCode(data.email, data.code, "password-reset");
      if (!otpCode) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
      
      if (!otpCode.userId) {
        return res.status(400).json({ message: "No user associated with this OTP" });
      }
      
      // Mark OTP as used
      await storage.markOtpAsUsed(otpCode.id);
      
      // Update password
      await storage.updateUser(otpCode.userId, { password: data.newPassword });
      
      res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      next(error);
    }
  });
  
  // User profile routes
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    // Don't send password back to client
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  
  // Get user's stored password (for viewing in profile)
  app.get("/api/user/password", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if the user is an admin
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (user.isAdmin) {
      // If admin, return the actual hashed password
      res.json({ password: user.password });
    } else {
      // For regular users, return a message indicating only admins can view passwords
      res.json({ password: "Only admin users can view password hashes" });
    }
  });
  
  app.patch("/api/profile", isAuthenticated, async (req, res, next) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      const userId = req.user.id;
      
      // If updating email, check if it's already in use
      if (data.email && data.email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(data.email);
        if (existingUser) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }
      
      // Set the new password without requiring current password verification
      if (data.newPassword) {
        // Set the new password directly
        data.password = await hashPassword(data.newPassword);
      }
      
      // Remove unnecessary fields before updating
      const { currentPassword, newPassword, ...updateData } = data;
      
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password back to client
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  // Transaction routes
  app.post("/api/transactions/send-money", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const sender = req.user;

    // রিসিভারের তথ্য চেক করুন
    const receiver = await storage.getUserByEmail(data.receiverEmail);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // নিজের কাছে টাকা পাঠানো বন্ধ করুন
    if (sender.id === receiver.id) {
      return res.status(400).json({ message: "Cannot send money to yourself" });
    }

    // সেলার ব্যালেন্স চেক
    if (sender.balance < data.amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // পাসওয়ার্ড যাচাই করুন
    const isPasswordValid = await comparePasswords(data.password, sender.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // ট্রানজেকশন তৈরি করুন
    const transaction = await storage.createTransaction({
      amount: data.amount,
      senderId: sender.id,
      receiverId: receiver.id,
      note: data.note || null
    });

    // ব্যালেন্স আপডেট করুন
    await storage.updateUser(sender.id, { balance: sender.balance - data.amount });
    await storage.updateUser(receiver.id, { balance: receiver.balance + data.amount });

    // নোটিফিকেশন পাঠান
    await sendTransactionNotificationEmail(sender, receiver, data.amount);

    // যদি সেলার ব্যালেন্স কমে যায় 1000 এর নিচে তবে সতর্কতা পাঠান
    if (sender.balance - data.amount < 1000) {
      await sendLowBalanceWarningEmail({ ...sender, balance: sender.balance - data.amount });
    }

    res.status(201).json({ message: "Transaction successful", transaction });
  } catch (error) {
    next(error);
  }
});

// ট্রানজেকশন ইতিহাস দেখার API
// নতুন API এন্ডপয়েন্ট - যা ইউজার টোকেন ব্যবহার করে ট্রানজেকশন করবে (সেন্ডার নিজেই)
// API দিয়ে লগইন ইউজারের ট্রানজেকশন রাউট (ইউজার আইডেন্টিফিকেশন সেশন থেকে আসবে)
app.post("/api/user/transfer", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { receiverEmail, amount, password, note } = req.body;
    const sender = req.user; // লগইন করা ইউজার থেকে সেন্ডার পাওয়া যাচ্ছে
    
    // আবশ্যকীয় ফিল্ড চেক করুন
    if (!receiverEmail || !amount || !password) {
      return res.status(400).json({ message: "Receiver email, amount and password are required" });
    }

    // রিসিভারের তথ্য চেক করুন
    const receiver = await storage.getUserByEmail(receiverEmail);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // নিজের কাছে টাকা পাঠানো বন্ধ করুন
    if (sender.id === receiver.id) {
      return res.status(400).json({ message: "Cannot send money to yourself" });
    }

    // সেন্ডারের ব্যালেন্স চেক করুন
    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // পাসওয়ার্ড যাচাই করুন
    const isPasswordValid = await comparePasswords(password, sender.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // ট্রানজেকশন তৈরি করুন
    const transaction = await storage.createTransaction({
      amount,
      senderId: sender.id,
      receiverId: receiver.id,
      note: note || null
    });

    // ব্যালেন্স আপডেট করুন
    await storage.updateUser(sender.id, { balance: sender.balance - amount });
    await storage.updateUser(receiver.id, { balance: receiver.balance + amount });

    // নোটিফিকেশন পাঠান
    await sendTransactionNotificationEmail(sender, receiver, amount);

    // যদি সেন্ডারের ব্যালেন্স কমে যায় 1000 এর নিচে তবে সতর্কতা পাঠান
    if (sender.balance - amount < 1000) {
      await sendLowBalanceWarningEmail({ ...sender, balance: sender.balance - amount });
    }

    res.status(201).json({
      message: "Transaction successful",
      transaction,
      currentBalance: sender.balance - amount
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/transfer", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { senderEmail, receiverEmail, amount, note } = req.body;
    const sender = req.user; // Logged-in user (sender)

    // Check if all required fields are provided
    if (!senderEmail || !receiverEmail || !amount) {
      return res.status(400).json({ error: "Invalid input", message: "Sender email, receiver email, and amount are required" });
    }

    // Check if the sender is the one making the request (email-based verification)
    if (senderEmail !== sender.email) {
      return res.status(403).json({ error: "Invalid input", message: "Sender email does not match authenticated user" });
    }

    // Fetch the receiver's details
    const receiver = await storage.getUserByEmail(receiverEmail);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found", message: "Receiver email not found in our records" });
    }

    // Prevent sending money to yourself
    if (sender.id === receiver.id) {
      return res.status(400).json({ error: "Invalid input", message: "Cannot send money to yourself" });
    }

    // Check if the sender has sufficient balance
    if (sender.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance", message: "You do not have enough balance to complete this transaction" });
    }

    // Update sender's and receiver's balances
    await storage.updateUser(sender.id, { balance: sender.balance - amount });
    await storage.updateUser(receiver.id, { balance: receiver.balance + amount });

    // Create the transaction record
    const transaction = await storage.createTransaction({
      amount,
      senderId: sender.id,
      receiverId: receiver.id,
      note: note || null
    });

    // Send transaction notification email to both sender and receiver
    await sendTransactionNotificationEmail(sender, receiver, amount);

    // Optional: Send low balance warning if the sender's balance is under the threshold
    if (sender.balance - amount < 1000) {
      await sendLowBalanceWarningEmail({ ...sender, balance: sender.balance - amount });
    }

    // Respond with the transaction details
    res.status(201).json({ message: "Transfer successful", transaction });
  } catch (error) {
    next(error);
  }
});


  
  // Admin routes
  app.get("/api/admin/users", isAdmin, async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/admin/transactions", isAdmin, async (req, res, next) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/admin/users/:id/block", isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent admin from blocking themselves
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot block yourself" });
      }
      
      const user = await storage.blockUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password back to client
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/admin/users/:id/unblock", isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.unblockUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password back to client
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/admin/users/:id/balance", isAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const { balance } = req.body;
      
      if (typeof balance !== 'number' || balance < 0) {
        return res.status(400).json({ message: "Balance must be a positive number" });
      }
      
      const user = await storage.updateUser(userId, { balance });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password back to client
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Two-Factor Authentication routes
  // Initialize 2FA setup
  app.post("/api/2fa/setup", isAuthenticated, async (req, res, next) => {
    try {
      const data = enable2FASchema.parse(req.body);
      
      // Verify user password before enabling 2FA
      const isPasswordValid = await comparePasswords(data.password, req.user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Incorrect password" });
      }
      
      // Check if 2FA is already enabled
      if (req.user.twoFactorEnabled) {
        return res.status(400).json({ message: "Two-factor authentication is already enabled" });
      }
      
      // Generate a new secret
      const secret = generateSecret(req.user.email);
      
      // Generate QR code for the user to scan
      const qrCodeUrl = await generateQRCode(req.user, secret);
      
      // Generate recovery codes
      const recoveryCodes = generateRecoveryCodes();
      
      // Store the secret temporarily in the session for later verification
      req.session.twoFactorSecret = secret;
      req.session.twoFactorRecoveryCodes = recoveryCodes;
      
      res.json({
        qrCodeUrl,
        secret,
        recoveryCodes,
        message: "Scan the QR code with your authenticator app"
      });
    } catch (error) {
      next(error);
    }
  });

  // Verify 2FA setup
  app.post("/api/2fa/verify", isAuthenticated, async (req, res, next) => {
    try {
      const data = verify2FASchema.parse(req.body);
      
      // Get the secret from the session
      const secret = req.session.twoFactorSecret;
      const recoveryCodes = req.session.twoFactorRecoveryCodes;
      
      if (!secret || !recoveryCodes) {
        return res.status(400).json({ message: "Two-factor setup session has expired" });
      }
      
      // Verify the token
      const isValid = verifyToken(data.code, secret);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Enable 2FA for the user
      const updatedUser = await enable2FA(req.user.id, secret);
      
      // Clear the temporary session data
      delete req.session.twoFactorSecret;
      delete req.session.twoFactorRecoveryCodes;
      
      // Don't send password back to client
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({
        ...userWithoutPassword,
        message: "Two-factor authentication enabled successfully"
      });
    } catch (error) {
      next(error);
    }
  });

  // Disable 2FA
  app.post("/api/2fa/disable", isAuthenticated, async (req, res, next) => {
    try {
      const data = disable2FASchema.parse(req.body);
      
      // Check if 2FA is enabled
      if (!req.user.twoFactorEnabled) {
        return res.status(400).json({ message: "Two-factor authentication is not enabled" });
      }
      
      // Verify password
      const isPasswordValid = await comparePasswords(data.password, req.user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Incorrect password" });
      }
      
      // Verify the token
      const isValid = verifyToken(data.code, req.user.twoFactorSecret);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Disable 2FA
      const updatedUser = await disable2FA(req.user.id);
      
      // Don't send password back to client
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({
        ...userWithoutPassword,
        message: "Two-factor authentication disabled successfully"
      });
    } catch (error) {
      next(error);
    }
  });

  // Use recovery code
  app.post("/api/2fa/recovery", isAuthenticated, async (req, res, next) => {
    try {
      const data = use2FARecoverySchema.parse(req.body);
      
      // Check if 2FA is enabled
      if (!req.user.twoFactorEnabled) {
        return res.status(400).json({ message: "Two-factor authentication is not enabled" });
      }
      
      // Use recovery code
      const isValid = await useRecoveryCode(req.user.id, data.recoveryCode);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid recovery code" });
      }
      
      res.json({ message: "Recovery code used successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Get 2FA status
  app.get("/api/2fa/status", isAuthenticated, (req, res) => {
    res.json({
      enabled: req.user.twoFactorEnabled
    });
  });
  
  // Admin settings API endpoints
  app.post("/api/admin/settings/system", isAdmin, async (req, res, next) => {
    try {
      // Parse and validate the incoming data using the schema
      const systemSettings = systemSettingsSchema.parse(req.body);
      
      // Log the received settings
      console.log("System settings update received:", systemSettings);
      
      // Here we would typically update these settings in a database
      // For now, we'll just return success with the received settings
      
      // Update any application values needed based on these settings
      // For example, we could update the default balance for new users
      
      res.status(200).json({ 
        message: "System settings updated successfully",
        settings: systemSettings
      });
    } catch (error) {
      console.error("Error updating system settings:", error);
      next(error);
    }
  });
  
  app.post("/api/admin/settings/email", isAdmin, async (req, res, next) => {
    try {
      // Parse and validate the incoming data using the schema
      const emailSettings = emailSettingsSchema.parse(req.body);
      
      // Log the received settings
      console.log("Email settings update received:", emailSettings);
      
      // Here we would typically update these settings in a database
      // For now, we'll just return success with the received settings
      
      res.status(200).json({ 
        message: "Email settings updated successfully",
        settings: emailSettings
      });
    } catch (error) {
      console.error("Error updating email settings:", error);
      next(error);
    }
  });
  
  app.post("/api/admin/settings/security", isAdmin, async (req, res, next) => {
    try {
      // Parse and validate the incoming data using the schema
      const securitySettings = securitySettingsSchema.parse(req.body);
      
      // Log the received settings
      console.log("Security settings update received:", securitySettings);
      
      // Here we would typically update these settings in a database
      // For now, we'll just return success with the received settings
      
      res.status(200).json({ 
        message: "Security settings updated successfully",
        settings: securitySettings
      });
    } catch (error) {
      console.error("Error updating security settings:", error);
      next(error);
    }
  });

  // User Settings API Routes
  app.get("/api/user-settings", isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/user-settings/:key", isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { key } = req.params;
      
      const setting = await storage.getUserSetting(userId, key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/user-settings", isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const data = insertUserSettingSchema.parse({
        ...req.body,
        userId
      });
      
      const setting = await storage.saveUserSetting(data);
      res.status(201).json(setting);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/user-settings/:key", isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { key } = req.params;
      
      await storage.deleteUserSetting(userId, key);
      res.status(200).json({ message: "Setting deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // User Documents API Routes
  app.get("/api/user-documents", isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const documents = await storage.getUserDocuments(userId);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/user-documents/:id", isAuthenticated, async (req, res, next) => {
    try {
      const { id } = req.params;
      const document = await storage.getUserDocument(Number(id));
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Ensure the document belongs to the requesting user
      if (document.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have permission to access this document" });
      }
      
      res.json(document);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/user-documents", isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const data = insertUserDocumentSchema.parse({
        ...req.body,
        userId
      });
      
      const document = await storage.saveUserDocument(data);
      res.status(201).json(document);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/user-documents/:id", isAuthenticated, async (req, res, next) => {
    try {
      const { id } = req.params;
      const document = await storage.getUserDocument(Number(id));
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Ensure the document belongs to the requesting user
      if (document.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have permission to modify this document" });
      }
      
      const updatedDocument = await storage.updateUserDocument(Number(id), req.body);
      res.json(updatedDocument);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/user-documents/:id", isAuthenticated, async (req, res, next) => {
    try {
      const { id } = req.params;
      const document = await storage.getUserDocument(Number(id));
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Ensure the document belongs to the requesting user
      if (document.userId !== req.user.id) {
        return res.status(403).json({ message: "You do not have permission to delete this document" });
      }
      
      await storage.deleteUserDocument(Number(id));
      res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
      next(error);
    }
  });
  
  // ===== API KEY BASED ROUTES =====
  
  // Create API Key
  app.post("/api/user/api-keys", isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const data = createApiKeySchema.parse(req.body);
      
      // Check if user has too many API keys (limit to 5 per user)
      const existingKeys = await storage.getUserApiKeys(userId);
      if (existingKeys.length >= 5) {
        return res.status(400).json({ 
          success: false,
          message: "You have reached the maximum number of API keys (5). Please delete an existing key before creating a new one." 
        });
      }
      
      // Create the API key
      const apiKey = await storage.createApiKey(userId, {
        name: data.name,
        permissions: data.permissions || ["transfer"],
        description: data.description || null,
        ipRestrictions: data.ipRestrictions || null,
        active: true,
        expiresAt: data.expirationDays 
          ? new Date(Date.now() + data.expirationDays * 24 * 60 * 60 * 1000) 
          : null
      });
      
      res.status(201).json({
        success: true,
        message: "API key created successfully",
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          key: apiKey.apiKey, // হুঁশিয়ারি: এই কী শুধু একবারই দেখানো হবে
          permissions: apiKey.permissions,
          description: apiKey.description,
          ipRestrictions: apiKey.ipRestrictions,
          active: apiKey.active,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt
        }
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      next(error);
    }
  });
  
  // Get all API Keys for a user
  app.get("/api/user/api-keys", isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const apiKeys = await storage.getUserApiKeys(userId);
      
      // Hide the full API key strings
      const safeApiKeys = apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.apiKey.substring(0, 8) + "..." + key.apiKey.substring(key.apiKey.length - 4),
        permissions: key.permissions,
        description: key.description,
        ipRestrictions: key.ipRestrictions,
        active: key.active,
        expiresAt: key.expiresAt,
        lastUsed: key.lastUsed,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt
      }));
      
      res.json({
        success: true,
        apiKeys: safeApiKeys
      });
    } catch (error) {
      console.error("Error fetching API keys:", error);
      next(error);
    }
  });
  
  // Update API Key
  app.patch("/api/user/api-keys/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const data = updateApiKeySchema.parse(req.body);
      
      // Check if the API key exists and belongs to the user
      const apiKey = await storage.getApiKeyById(Number(id));
      if (!apiKey) {
        return res.status(404).json({
          success: false,
          message: "API key not found"
        });
      }
      
      if (apiKey.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to update this API key"
        });
      }
      
      // Update the API key
      const updatedApiKey = await storage.updateApiKey(Number(id), {
        name: data.name,
        permissions: data.permissions,
        description: data.description,
        ipRestrictions: data.ipRestrictions,
        active: data.active,
        expiresAt: data.expirationDays 
          ? new Date(Date.now() + data.expirationDays * 24 * 60 * 60 * 1000) 
          : apiKey.expiresAt // If no new expiration, keep the old one
      });
      
      res.json({
        success: true,
        message: "API key updated successfully",
        apiKey: {
          id: updatedApiKey.id,
          name: updatedApiKey.name,
          keyPrefix: updatedApiKey.apiKey.substring(0, 8) + "..." + updatedApiKey.apiKey.substring(updatedApiKey.apiKey.length - 4),
          permissions: updatedApiKey.permissions,
          description: updatedApiKey.description,
          ipRestrictions: updatedApiKey.ipRestrictions,
          active: updatedApiKey.active,
          expiresAt: updatedApiKey.expiresAt,
          lastUsed: updatedApiKey.lastUsed,
          updatedAt: updatedApiKey.updatedAt
        }
      });
    } catch (error) {
      console.error("Error updating API key:", error);
      next(error);
    }
  });
  
  // Delete API Key
  app.delete("/api/user/api-keys/:id", isAuthenticated, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Check if the API key exists and belongs to the user
      const apiKey = await storage.getApiKeyById(Number(id));
      if (!apiKey) {
        return res.status(404).json({
          success: false,
          message: "API key not found"
        });
      }
      
      if (apiKey.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to delete this API key"
        });
      }
      
      // Delete the API key
      await storage.deleteApiKey(Number(id));
      
      res.json({
        success: true,
        message: "API key deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting API key:", error);
      next(error);
    }
  });
  
  // API কী দিয়ে অর্থ স্থানান্তর করার এন্ডপয়েন্ট (বাইরের ওয়েবসাইট থেকে কল করা যাবে)
  app.post("/api/transfer", validateApiKey, checkApiKeyPermission("transfer"), async (req, res, next) => {
    try {
      const data = apiKeyTransferSchema.parse(req.body);
      const sender = req.user; // validateApiKey মিডলওয়্যার API কী-এর মালিককে req.user হিসেবে সেট করে
      
      // রিসিভারকে খুঁজে বের করা
      const receiver = await storage.getUserByEmail(data.receiverEmail);
      if (!receiver) {
        return res.status(404).json({ 
          success: false,
          message: "Receiver not found" 
        });
      }
      
      // নিজের কাছে টাকা পাঠানো বন্ধ করা
      if (sender.id === receiver.id) {
        return res.status(400).json({ 
          success: false,
          message: "Cannot send money to yourself" 
        });
      }
      
      // ব্যালেন্স চেক করা
      if (sender.balance < data.amount) {
        return res.status(400).json({ 
          success: false,
          message: "Insufficient balance" 
        });
      }
      
      // ট্রানজেকশন তৈরি করা
      const transaction = await storage.createTransaction({
        amount: data.amount,
        senderId: sender.id,
        receiverId: receiver.id,
        note: data.note || "API Transaction"
      });
      
      // সেন্ডার এবং রিসিভারের ব্যালেন্স আপডেট করা
      await storage.updateUser(sender.id, { balance: sender.balance - data.amount });
      await storage.updateUser(receiver.id, { balance: receiver.balance + data.amount });
      
      // ট্রানজেকশন নোটিফিকেশন পাঠানো (ঐচ্ছিক)
      if (data.sendNotification !== false) {
        await sendTransactionNotificationEmail(sender, receiver, data.amount);
      }
      
      // যদি সেন্ডারের ব্যালেন্স কমে যায় 1000 এর নিচে তবে সতর্কতা পাঠানো
      if (sender.balance - data.amount < 1000) {
        await sendLowBalanceWarningEmail({ ...sender, balance: sender.balance - data.amount });
      }
      
      res.status(201).json({
        success: true,
        message: "Transaction successful",
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          receiverEmail: receiver.email,
          note: transaction.note,
          timestamp: transaction.createdAt
        },
        currentBalance: sender.balance - data.amount
      });
    } catch (error) {
      console.error("API transfer error:", error);
      next(error);
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket setup is temporarily disabled to stabilize the server
  // We'll re-enable it once the basic functionality is working
  
  return httpServer;
}

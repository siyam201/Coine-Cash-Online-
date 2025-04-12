import { pgTable, text, serial, integer, timestamp, doublePrecision, boolean, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  balance: doublePrecision("balance").notNull().default(10000), // Start with 10,000 as free balance
  isVerified: boolean("is_verified").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  recoveryCodesJson: jsonb("recovery_codes_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: doublePrecision("amount").notNull(),
  senderId: integer("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  receiverId: integer("receiver_id").references(() => users.id, { onDelete: "set null" }),
  note: text("note"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  code: text("code").notNull(),
  purpose: text("purpose").notNull(), // "verification", "password-reset", "transaction"
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  settingKey: varchar("setting_key", { length: 255 }).notNull(),
  settingValue: text("setting_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userDocuments = pgTable("user_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(),
  documentName: varchar("document_name", { length: 255 }).notNull(),
  documentData: text("document_data").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),  // API কী-এর একটি বর্ণনামূলক নাম
  apiKey: varchar("api_key", { length: 64 }).notNull().unique(),  // অনন্য API কী
  active: boolean("active").notNull().default(true),  // এই API কী সক্রিয় আছে কিনা
  permissions: jsonb("permissions").notNull(),  // অনুমতিসমূহ ["transfer", "balance", "history"]
  lastUsed: timestamp("last_used"),
  expiresAt: timestamp("expires_at"),
  ipRestrictions: jsonb("ip_restrictions"),  // IP ঠিকানার সীমাবদ্ধতা
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sentTransactions: many(transactions, { relationName: "sender" }),
  receivedTransactions: many(transactions, { relationName: "receiver" }),
  otpCodes: many(otpCodes),
  settings: many(userSettings),
  documents: many(userDocuments),
  apiKeys: many(apiKeys)
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  sender: one(users, {
    fields: [transactions.senderId],
    references: [users.id],
    relationName: "sender"
  }),
  receiver: one(users, {
    fields: [transactions.receiverId],
    references: [users.id],
    relationName: "receiver"
  })
}));

export const otpCodesRelations = relations(otpCodes, ({ one }) => ({
  user: one(users, {
    fields: [otpCodes.userId],
    references: [users.id]
  })
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id]
  })
}));

export const userDocumentsRelations = relations(userDocuments, ({ one }) => ({
  user: one(users, {
    fields: [userDocuments.userId],
    references: [users.id]
  })
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id]
  })
}));

// Schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
}).omit({ id: true, createdAt: true, updatedAt: true, isAdmin: true });

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true, 
  status: true,
  senderId: true
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({ 
  id: true, 
  createdAt: true, 
  isUsed: true 
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  purpose: z.string()
});

export const sendMoneySchema = z.object({
  receiverEmail: z.string().email(),
  amount: z.number().positive(),
  note: z.string().optional(),
  password: z.string()
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export const updatePasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8)
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export const enable2FASchema = z.object({
  password: z.string().min(8),
});

export const verify2FASchema = z.object({
  code: z.string().min(6).max(6),
});

export const disable2FASchema = z.object({
  password: z.string().min(8),
  code: z.string().min(6).max(6),
});

export const use2FARecoverySchema = z.object({
  recoveryCode: z.string(),
});

export const twoFactorLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  code: z.string().min(6).max(6),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type Enable2FA = z.infer<typeof enable2FASchema>;
export type Verify2FA = z.infer<typeof verify2FASchema>;
export type Disable2FA = z.infer<typeof disable2FASchema>;
export type Use2FARecovery = z.infer<typeof use2FARecoverySchema>;
export type TwoFactorLogin = z.infer<typeof twoFactorLoginSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;

export type VerifyOtp = z.infer<typeof verifyOtpSchema>;
export type SendMoney = z.infer<typeof sendMoneySchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type UpdatePassword = z.infer<typeof updatePasswordSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Admin Settings Schemas
export const systemSettingsSchema = z.object({
  maintenanceMode: z.boolean(),
  debugMode: z.boolean(),
  initialBalance: z.number().positive(),
  minTransactionAmount: z.number().positive(),
  maxTransactionAmount: z.number().positive(),
});

export const emailSettingsSchema = z.object({
  senderName: z.string().min(2),
  senderEmail: z.string().email(),
  sendWelcomeEmail: z.boolean(),
  sendTransactionNotifications: z.boolean(),
  sendLowBalanceWarnings: z.boolean(),
});

export const securitySettingsSchema = z.object({
  requireTwoFactorForAdmins: z.boolean(),
  passwordMinLength: z.number().int().positive(),
  sessionTimeoutMinutes: z.number().int().positive(),
  maxLoginAttempts: z.number().int().positive(),
});

export type SystemSettings = z.infer<typeof systemSettingsSchema>;
export type EmailSettings = z.infer<typeof emailSettingsSchema>;
export type SecuritySettings = z.infer<typeof securitySettingsSchema>;

// User Settings and Documents
export const insertUserSettingSchema = createInsertSchema(userSettings).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertUserDocumentSchema = createInsertSchema(userDocuments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type UserSetting = typeof userSettings.$inferSelect;
export type InsertUserSetting = z.infer<typeof insertUserSettingSchema>;

export type UserDocument = typeof userDocuments.$inferSelect;
export type InsertUserDocument = z.infer<typeof insertUserDocumentSchema>;

// API Key schemas and types
export const createApiKeySchema = z.object({
  name: z.string().min(3).max(255),
  permissions: z.array(z.enum(["transfer", "balance", "history"])),
  expiresAt: z.date().optional(),
  ipRestrictions: z.array(z.string()).optional()
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  apiKey: true,  // API কী সার্ভার দ্বারা জেনারেট হবে
  createdAt: true,
  updatedAt: true,
  lastUsed: true
});

export const apiKeyResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  apiKey: z.string(),  // এটা শুধু একবারই দেখানো হবে, তারপর এনক্রিপ্টেড থাকবে
  permissions: z.array(z.string()),
  active: z.boolean(),
  expiresAt: z.date().nullable(),
  createdAt: z.date()
});

export const updateApiKeySchema = z.object({
  name: z.string().min(3).max(255).optional(),
  active: z.boolean().optional(),
  permissions: z.array(z.enum(["transfer", "balance", "history"])).optional(),
  expiresAt: z.date().nullable().optional(),
  ipRestrictions: z.array(z.string()).nullable().optional()
});

export const apiKeyTransferSchema = z.object({
  receiverEmail: z.string().email(),
  amount: z.number().positive(),
  note: z.string().optional()
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type CreateApiKey = z.infer<typeof createApiKeySchema>;
export type ApiKeyResponse = z.infer<typeof apiKeyResponseSchema>;
export type UpdateApiKey = z.infer<typeof updateApiKeySchema>;
export type ApiKeyTransfer = z.infer<typeof apiKeyTransferSchema>;

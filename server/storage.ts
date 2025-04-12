import { 
  users, transactions, otpCodes, userSettings, userDocuments, apiKeys,
  type User, type InsertUser, 
  type Transaction, type InsertTransaction,
  type OtpCode, type InsertOtpCode,
  type UserSetting, type InsertUserSetting,
  type UserDocument, type InsertUserDocument,
  type ApiKey, type InsertApiKey, type UpdateApiKey
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, or, desc, gte, lt, inArray } from "drizzle-orm";
import { hashPassword } from "./auth";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  blockUser(id: number): Promise<User | undefined>;
  unblockUser(id: number): Promise<User | undefined>;
  
  // Transaction methods
  createTransaction(data: InsertTransaction & { senderId: number }): Promise<Transaction>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getUserTransactionsWithEmails(userId: number): Promise<(Transaction & { senderEmail?: string; receiverEmail?: string })[]>;
  getAllTransactions(): Promise<Transaction[]>;
  
  // OTP methods
  createOtpCode(data: InsertOtpCode): Promise<OtpCode>;
  getOtpCode(email: string, code: string, purpose: string): Promise<OtpCode | undefined>;
  getOtpCodes(email: string): Promise<OtpCode[]>;
  markOtpAsUsed(id: number): Promise<void>;

  // User Settings methods
  getUserSettings(userId: number): Promise<UserSetting[]>;
  getUserSetting(userId: number, key: string): Promise<UserSetting | undefined>;
  saveUserSetting(data: InsertUserSetting): Promise<UserSetting>;
  deleteUserSetting(userId: number, key: string): Promise<void>;
  
  // User Documents methods
  getUserDocuments(userId: number): Promise<UserDocument[]>;
  getUserDocument(id: number): Promise<UserDocument | undefined>;
  saveUserDocument(data: InsertUserDocument): Promise<UserDocument>;
  updateUserDocument(id: number, data: Partial<UserDocument>): Promise<UserDocument | undefined>;
  deleteUserDocument(id: number): Promise<void>;
  
  // API Key methods
  createApiKey(userId: number, data: InsertApiKey): Promise<ApiKey>;
  generateApiKeyString(): Promise<string>;
  getApiKey(apiKey: string): Promise<ApiKey | undefined>;
  getApiKeyById(id: number): Promise<ApiKey | undefined>;
  getUserApiKeys(userId: number): Promise<ApiKey[]>;
  updateApiKey(id: number, data: UpdateApiKey): Promise<ApiKey | undefined>;
  deleteApiKey(id: number): Promise<void>;
  markApiKeyAsUsed(id: number): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    if (process.env.DATABASE_URL) {
      this.sessionStore = new PostgresSessionStore({
        pool: pool,
        createTableIfMissing: true
      });
    } else {
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await hashPassword(userData.password);
    
    const [user] = await db
      .insert(users)
      .values({ ...userData, password: hashedPassword })
      .returning();
    
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    // If password is being updated, hash it first
    if (data.password) {
      data.password = await hashPassword(data.password);
    }
    
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async blockUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isBlocked: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return user;
  }

  async unblockUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isBlocked: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return user;
  }

  // Transaction methods
  async createTransaction(data: InsertTransaction & { senderId: number }): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(data)
      .returning();
    
    return transaction;
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(
        or(
          eq(transactions.senderId, userId),
          eq(transactions.receiverId, userId)
        )
      )
      .orderBy(desc(transactions.createdAt));
  }
  
  async getUserTransactionsWithEmails(userId: number): Promise<(Transaction & { senderEmail?: string; receiverEmail?: string })[]> {
    // First get all transactions
    const userTransactions = await this.getUserTransactions(userId);
    
    // Get all unique user IDs from the transactions
    const userIds = new Set<number>();
    userTransactions.forEach(transaction => {
      if (transaction.senderId) userIds.add(transaction.senderId);
      if (transaction.receiverId) userIds.add(transaction.receiverId);
    });
    
    // Convert Set to Array
    const userIdArray = Array.from(userIds);
    
    // Get all users in a single query (only if there are any IDs)
    let usersArray: User[] = [];
    if (userIdArray.length > 0) {
      // Use simpler approach with multiple OR conditions for now
      // as inArray seems to have issues
      usersArray = await db
        .select()
        .from(users)
        .where(
          or(
            ...userIdArray.map(id => eq(users.id, id))
          )
        );
    }
    
    // Create a map for easy lookup
    const userMap = new Map<number, User>();
    usersArray.forEach(user => {
      userMap.set(user.id, user);
    });
    
    // Enrich transactions with email information
    return userTransactions.map(transaction => {
      // Safely handle null values for senderId and receiverId
      const senderId = transaction.senderId || 0;
      const receiverId = transaction.receiverId || 0;
      
      const sender = userMap.get(senderId);
      const receiver = userMap.get(receiverId);
      
      return {
        ...transaction,
        senderEmail: sender?.email,
        receiverEmail: receiver?.email
      };
    });
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  // OTP methods
  async createOtpCode(data: InsertOtpCode): Promise<OtpCode> {
    // First, invalidate any existing OTPs for this user and purpose
    await db
      .update(otpCodes)
      .set({ isUsed: true })
      .where(
        and(
          eq(otpCodes.email, data.email),
          eq(otpCodes.purpose, data.purpose),
          eq(otpCodes.isUsed, false)
        )
      );
    
    // Then create a new OTP
    const [otpCode] = await db
      .insert(otpCodes)
      .values(data)
      .returning();
    
    return otpCode;
  }

  async getOtpCode(email: string, code: string, purpose: string): Promise<OtpCode | undefined> {
    const now = new Date();
    
    const [otpCode] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, code),
          eq(otpCodes.purpose, purpose),
          eq(otpCodes.isUsed, false),
          gte(otpCodes.expiresAt, now)
        )
      );
    
    return otpCode;
  }
  
  async getOtpCodes(email: string): Promise<OtpCode[]> {
    return db
      .select()
      .from(otpCodes)
      .where(eq(otpCodes.email, email))
      .orderBy(desc(otpCodes.createdAt));
  }

  async markOtpAsUsed(id: number): Promise<void> {
    await db
      .update(otpCodes)
      .set({ isUsed: true })
      .where(eq(otpCodes.id, id));
  }

  // User Settings methods
  async getUserSettings(userId: number): Promise<UserSetting[]> {
    return db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .orderBy(userSettings.settingKey);
  }

  async getUserSetting(userId: number, key: string): Promise<UserSetting | undefined> {
    const [setting] = await db
      .select()
      .from(userSettings)
      .where(
        and(
          eq(userSettings.userId, userId),
          eq(userSettings.settingKey, key)
        )
      );
    
    return setting;
  }

  async saveUserSetting(data: InsertUserSetting): Promise<UserSetting> {
    // Check if setting already exists
    const existingSetting = await this.getUserSetting(data.userId, data.settingKey);
    
    if (existingSetting) {
      // Update existing setting
      const [setting] = await db
        .update(userSettings)
        .set({ 
          settingValue: data.settingValue,
          updatedAt: new Date()
        })
        .where(eq(userSettings.id, existingSetting.id))
        .returning();
      
      return setting;
    } else {
      // Create new setting
      const [setting] = await db
        .insert(userSettings)
        .values(data)
        .returning();
      
      return setting;
    }
  }

  async deleteUserSetting(userId: number, key: string): Promise<void> {
    await db
      .delete(userSettings)
      .where(
        and(
          eq(userSettings.userId, userId),
          eq(userSettings.settingKey, key)
        )
      );
  }
  
  // User Documents methods
  async getUserDocuments(userId: number): Promise<UserDocument[]> {
    return db
      .select()
      .from(userDocuments)
      .where(eq(userDocuments.userId, userId))
      .orderBy(desc(userDocuments.createdAt));
  }

  async getUserDocument(id: number): Promise<UserDocument | undefined> {
    const [document] = await db
      .select()
      .from(userDocuments)
      .where(eq(userDocuments.id, id));
    
    return document;
  }

  async saveUserDocument(data: InsertUserDocument): Promise<UserDocument> {
    const [document] = await db
      .insert(userDocuments)
      .values(data)
      .returning();
    
    return document;
  }

  async updateUserDocument(id: number, data: Partial<UserDocument>): Promise<UserDocument | undefined> {
    const [document] = await db
      .update(userDocuments)
      .set({ 
        ...data,
        updatedAt: new Date()
      })
      .where(eq(userDocuments.id, id))
      .returning();
    
    return document;
  }

  async deleteUserDocument(id: number): Promise<void> {
    await db
      .delete(userDocuments)
      .where(eq(userDocuments.id, id));
  }

  // API Key methods
  async generateApiKeyString(): Promise<string> {
    // একটি ইউনিক API কী জেনারেট করে
    const apiKey = randomBytes(32).toString('hex');
    // 32 বাইট (64 হেক্স ক্যারেক্টার) রেন্ডম স্ট্রিং জেনারেট করা
    return apiKey;
  }

  async createApiKey(userId: number, data: InsertApiKey): Promise<ApiKey> {
    // API কী স্ট্রিং জেনারেট করা
    const apiKeyString = await this.generateApiKeyString();
    
    // নতুন API কী তৈরি করা
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        ...data,
        userId,
        apiKey: apiKeyString
      })
      .returning();
    
    return apiKey;
  }

  async getApiKey(apiKeyString: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.apiKey, apiKeyString));
    
    return key;
  }

  async getApiKeyById(id: number): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id));
    
    return key;
  }

  async getUserApiKeys(userId: number): Promise<ApiKey[]> {
    return db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async updateApiKey(id: number, data: UpdateApiKey): Promise<ApiKey | undefined> {
    const [apiKey] = await db
      .update(apiKeys)
      .set({ 
        ...data,
        updatedAt: new Date()
      })
      .where(eq(apiKeys.id, id))
      .returning();
    
    return apiKey;
  }

  async deleteApiKey(id: number): Promise<void> {
    await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, id));
  }

  async markApiKeyAsUsed(id: number): Promise<void> {
    await db
      .update(apiKeys)
      .set({ 
        lastUsed: new Date(),
        updatedAt: new Date()
      })
      .where(eq(apiKeys.id, id));
  }
}

export const storage = new DatabaseStorage();
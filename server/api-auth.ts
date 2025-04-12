import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// API কী ভেরিফিকেশন মিডলওয়্যার
export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    // API কী হেডার থেকে পাওয়া (x-api-key)
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(401).json({ 
        success: false,
        message: "API key is required" 
      });
    }

    // API কী ডাটাবেস থেকে খুঁজে বের করা
    const apiKeyData = await storage.getApiKey(apiKey);
    
    if (!apiKeyData) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid API key" 
      });
    }

    // API কী এক্টিভ আছে কিনা চেক করা
    if (!apiKeyData.active) {
      return res.status(403).json({ 
        success: false,
        message: "This API key has been deactivated" 
      });
    }

    // API কী এক্সপায়ার হয়েছে কিনা চেক করা
    if (apiKeyData.expiresAt && new Date() > apiKeyData.expiresAt) {
      return res.status(403).json({ 
        success: false,
        message: "This API key has expired" 
      });
    }

    // IP রেস্ট্রিকশন চেক করা (যদি কনফিগার করা থাকে)
    if (apiKeyData.ipRestrictions) {
      const ipRestrictions = apiKeyData.ipRestrictions as string[];
      const clientIp = req.ip || req.socket.remoteAddress || "";
      
      if (ipRestrictions.length > 0 && !ipRestrictions.includes(clientIp)) {
        return res.status(403).json({ 
          success: false,
          message: "Access denied from this IP address" 
        });
      }
    }

    // ইউজার তথ্য লোড করা
    const user = await storage.getUser(apiKeyData.userId);
    
    if (!user) {
      return res.status(403).json({ 
        success: false,
        message: "User associated with this API key not found" 
      });
    }

    // ইউজার ব্লক করা আছে কিনা চেক করা
    if (user.isBlocked) {
      return res.status(403).json({ 
        success: false,
        message: "User associated with this API key is blocked" 
      });
    }

    // অ্যাকাউন্ট ভেরিফাইড কিনা চেক করা
    if (!user.isVerified) {
      return res.status(403).json({ 
        success: false,
        message: "User account not verified" 
      });
    }

    // API কী ব্যবহারকারী এবং অ্যাক্সেস রাইটস রিকোয়েস্ট অবজেক্টে যোগ করা
    req.user = user;
    req.apiKey = apiKeyData;

    // API কী ব্যবহারের হিসাব আপডেট করা
    await storage.markApiKeyAsUsed(apiKeyData.id);

    next();
  } catch (error) {
    console.error("API key validation error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error during API key validation" 
    });
  }
}

// API কী পারমিশন চেক মিডলওয়্যার (রিকোয়েস্ট হ্যান্ডলার রাউটে অবশ্যই validateApiKey এর পরে ব্যবহার করতে হবে)
export function checkApiKeyPermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // validateApiKey মিডলওয়্যার অবশ্যই আগে কল করতে হবে
      if (!req.apiKey) {
        return res.status(500).json({
          success: false,
          message: "Internal server error: API key validation middleware not called" 
        });
      }

      // API কীতে প্রয়োজনীয় পারমিশন আছে কিনা চেক করা
      const permissions = req.apiKey.permissions as string[];
      
      if (!permissions.includes(requiredPermission)) {
        return res.status(403).json({ 
          success: false,
          message: `This API key doesn't have the required '${requiredPermission}' permission` 
        });
      }

      next();
    } catch (error) {
      console.error("API key permission check error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error during API key permission check" 
      });
    }
  };
}

// Express Request টাইপ অগমেন্টেশন - টাইপস্ক্রিপ্ট কম্পাইলার ত্রুটি এড়াতে
declare global {
  namespace Express {
    interface Request {
      apiKey?: any;
    }
  }
}
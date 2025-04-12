import { createContext, ReactNode, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User, InsertUser, LoginUser, UpdateProfile, VerifyOtp } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  verificationRequired: boolean;
  loginMutation: UseMutationResult<Omit<User, 'password'>, Error, LoginUser>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<User, 'password'>, Error, InsertUser>;
  updateProfileMutation: UseMutationResult<Omit<User, 'password'>, Error, UpdateProfile>;
  verifyEmailMutation: UseMutationResult<{message: string}, Error, VerifyOtp>;
  requestVerificationCodeMutation: UseMutationResult<{message: string}, Error, {email: string, purpose: string}>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [verificationRequired, setVerificationRequired] = useState(false);
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginUser) => {
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
        return await res.json();
      } catch (error) {
        // Check if error response contains verification required flag
        if (error instanceof Error) {
          const message = error.message;
          if (message.includes("Email verification required") || message.includes("verificationRequired")) {
            setVerificationRequired(true);
          }
        }
        throw error;
      }
    },
    onSuccess: (user: Omit<User, 'password'>) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Check if user is verified
      if (!user.isVerified) {
        setVerificationRequired(true);
        toast({
          title: "Email verification required",
          description: "Please verify your email to access your account",
        });
      } else {
        toast({
          title: "Login successful",
          description: `Welcome, ${user.name}!`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: Omit<User, 'password'>) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Always set verification required after registration
      setVerificationRequired(true);
      
      toast({
        title: "Registration successful",
        description: "Please check your email for verification code.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return await res.json();
    },
    onSuccess: (user: Omit<User, 'password'>) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const verifyEmailMutation = useMutation({
    mutationFn: async (data: VerifyOtp) => {
      const res = await apiRequest("POST", "/api/verify-otp", data);
      return await res.json();
    },
    onSuccess: () => {
      // Refresh user data to get updated verification status
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setVerificationRequired(false);
      toast({
        title: "Email verified",
        description: "Your email has been verified successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const requestVerificationCodeMutation = useMutation({
    mutationFn: async (data: {email: string, purpose: string}) => {
      const res = await apiRequest("POST", "/api/request-otp", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification code sent",
        description: "Please check your email for the verification code.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send verification code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        verificationRequired,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
        verifyEmailMutation,
        requestVerificationCodeMutation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

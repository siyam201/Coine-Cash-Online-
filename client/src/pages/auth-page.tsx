import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggleWithLabels } from "@/components/ThemeToggle";
import { ThemeProvider } from "@/hooks/use-theme";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertUser, insertUserSchema, loginUserSchema } from "@shared/schema";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp-form";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Shield, 
  CreditCard,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  DollarSign,
  Wallet
} from "lucide-react";

type AuthTab = "login" | "register";

const loginFormSchema = loginUserSchema;
const registerFormSchema = insertUserSchema;

type LoginFormValues = z.infer<typeof loginFormSchema>;
type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function AuthPage() {
  const [authTab, setAuthTab] = useState<AuthTab>("login");
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, loginMutation, registerMutation, verificationRequired } = useAuth();

  // Redirect if already logged in and verified
  useEffect(() => {
    if (user) {
      // Only redirect to dashboard if user is verified
      if (user.isVerified && !verificationRequired) {
        navigate("/");
      } else {
        // If user is logged in but not verified, the App component will show the verification screen
        navigate("/");
      }
    }
  }, [user, navigate, verificationRequired]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // OTP Verification form
  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await apiRequest("POST", "/api/verify-otp", {
        email: registerForm.getValues("email"),
        code: otpValue,
        purpose: "verification",
      });

      toast({
        title: "Success",
        description: "Your account has been verified successfully!",
      });

      setIsVerifyModalOpen(false);
      navigate("/");
    } catch (error) {
      toast({
        title: "Verification failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // Request new OTP
  const handleResendOtp = async () => {
    try {
      await apiRequest("POST", "/api/request-otp", {
        email: registerForm.getValues("email"),
        purpose: "verification",
      });

      toast({
        title: "OTP Sent",
        description: "A new verification code has been sent to your email",
      });
    } catch (error) {
      toast({
        title: "Failed to send OTP",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // Navigate to reset password page
  const handleResetPassword = () => {
    navigate("/reset-password");
  };
  
  // This is no longer used but keeping as reference
  const _handleResetPasswordOld = async () => {
    if (!resetEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/request-reset-password", { email: resetEmail });
      
      toast({
        title: "Password Reset Initiated",
        description: "If your email exists in our system, you will receive password reset instructions",
      });
      
      setIsResettingPassword(false);
    } catch (error) {
      toast({
        title: "Reset failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        navigate("/");
      }
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        setIsVerifyModalOpen(true);
      }
    });
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
        <div className="grid md:grid-cols-2 min-h-screen">
          {/* Left column - Auth forms */}
          <div className="flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
            <div className="mx-auto w-full max-w-md">
              {/* Logo and App Title */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 opacity-75 blur-sm animate-pulse"></div>
                  <div className="relative h-16 w-16 rounded-full flex items-center justify-center shadow-lg overflow-hidden bg-white dark:bg-gray-700">
                   <img src="logo.png" alt="Coine Cash Online Logo" className="h-16 w-16" />
                  </div>
                </div>
              </div>
              <h2 className="text-center text-3xl font-extrabold mb-2 text-gray-900 dark:text-white">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600">
                  Coine Cash Online
                </span>
              </h2>
              <p className="text-center text-gray-500 dark:text-gray-400 mb-8">Your trusted platform for digital transactions</p>
              
              {/* Auth Tabs */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
                <nav className="flex" aria-label="Tabs">
                  <button 
                    onClick={() => setAuthTab("login")}
                    className={`w-1/2 py-2 px-3 text-center rounded-md font-medium transition-all ${
                      authTab === "login" 
                        ? "bg-white dark:bg-gray-800 text-primary-600 shadow-sm" 
                        : "text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <Lock className="h-4 w-4 mr-2" />
                      Login
                    </div>
                  </button>
                  <button 
                    onClick={() => setAuthTab("register")}
                    className={`w-1/2 py-2 px-3 text-center rounded-md font-medium transition-all ${
                      authTab === "register" 
                        ? "bg-white dark:bg-gray-800 text-primary-600 shadow-sm" 
                        : "text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <User className="h-4 w-4 mr-2" />
                      Register
                    </div>
                  </button>
                </nav>
              </div>
            
              {/* Login Form */}
              <div className={`mt-8 ${authTab !== "login" && "hidden"}`}>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Mail className="h-4 w-4 text-green-500" />
                            Email Address
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                placeholder="Your email address" 
                                {...field} 
                                type="email"
                                autoComplete="email"
                              />
                            </FormControl>
                            <Mail className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Lock className="h-4 w-4 text-green-500" />
                            Password
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                placeholder="Your password" 
                                {...field} 
                                type={showLoginPassword ? "text" : "password"}
                                autoComplete="current-password"
                              />
                            </FormControl>
                            <Lock className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                            >
                              {showLoginPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Checkbox id="remember-me" />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                          Remember me
                        </label>
                      </div>
                      
                      <div className="text-sm">
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500 hover:opacity-80"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-base relative overflow-hidden group transition-all duration-200 shadow-md hover:shadow-lg"
                      disabled={loginMutation.isPending}
                    >
                      <span className="absolute right-0 w-8 h-32 -mt-12 opacity-10 rotate-12 group-hover:translate-x-12 transition-transform duration-1000 bg-white"></span>
                      <div className="flex items-center justify-center gap-2">
                        <Lock className={`h-4 w-4 ${loginMutation.isPending ? "animate-pulse" : "animate-none"}`} />
                        {loginMutation.isPending ? "Logging in..." : "Sign In to Your Account"}
                      </div>
                    </Button>
                  </form>
                </Form>
              </div>
              
              {/* Register Form */}
              <div className={`mt-8 ${authTab !== "register" && "hidden"}`}>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <User className="h-4 w-4 text-green-500" />
                            Full Name
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                placeholder="Your full name" 
                                {...field} 
                              />
                            </FormControl>
                            <User className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Mail className="h-4 w-4 text-green-500" />
                            Email Address
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                placeholder="Your email address" 
                                {...field} 
                                type="email"
                                autoComplete="email"
                              />
                            </FormControl>
                            <Mail className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Lock className="h-4 w-4 text-green-500" />
                            Password
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input 
                                className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                placeholder="At least 8 characters" 
                                {...field} 
                                type={showRegisterPassword ? "text" : "password"}
                                autoComplete="new-password"
                              />
                            </FormControl>
                            <Lock className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                              onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            >
                              {showRegisterPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <FormMessage />
                          <p className="text-xs text-gray-500 mt-1">
                            Password must be at least 8 characters
                          </p>
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-base relative overflow-hidden group transition-all duration-200 shadow-md hover:shadow-lg"
                      disabled={registerMutation.isPending}
                    >
                      <span className="absolute right-0 w-8 h-32 -mt-12 opacity-10 rotate-12 group-hover:translate-x-12 transition-transform duration-1000 bg-white"></span>
                      <div className="flex items-center justify-center gap-2">
                        <User className={`h-4 w-4 ${registerMutation.isPending ? "animate-pulse" : "animate-none"}`} />
                        {registerMutation.isPending ? "Creating Account..." : "Create Free Account"}
                      </div>
                    </Button>
                    <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
                      By registering, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </form>
                </Form>
              </div>
              
              {/* Theme Toggle */}
              <div className="mt-8 text-center flex items-center justify-center">
                <ThemeToggleWithLabels />
              </div>
            </div>
          </div>
          
          {/* Right column - Feature showcase */}
          <div className="hidden md:flex flex-col relative bg-gradient-to-br from-green-600 to-blue-700 overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-700/50 to-transparent" />
            
            <div className="relative flex flex-col h-full items-center justify-center text-white p-8">
              <div className="max-w-lg">
                <h2 className="text-3xl font-bold mb-4">Experience the Future of Digital Payments</h2>
                <p className="text-primary-100 mb-8 text-lg leading-relaxed">
                  Coine Cash Online makes transferring money as simple as sending a message. Fast, secure, and designed for your convenience.
                </p>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-white/10 p-3 rounded-lg">
                      <Shield className="h-6 w-6 text-green-200" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl">Bank-Grade Security</h3>
                      <p className="text-primary-100 mt-1">Your transactions and personal information are protected with industry-standard encryption.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-white/10 p-3 rounded-lg">
                      <Wallet className="h-6 w-6 text-blue-200" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl">Instant Transfers</h3>
                      <p className="text-primary-100 mt-1">Send and receive money in seconds, without the traditional banking delays.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-white/10 p-3 rounded-lg">
                      <User className="h-6 w-6 text-teal-200" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl">User Friendly</h3>
                      <p className="text-primary-100 mt-1">Our intuitive interface makes managing your finances easier than ever before.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <Dialog open={isVerifyModalOpen} onOpenChange={setIsVerifyModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border-0 shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-600 to-blue-600"></div>
          <DialogHeader className="pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-white">
              Verify Your Email
            </DialogTitle>
            <DialogDescription className="text-center max-w-sm mx-auto">
              We've sent a 6-digit verification code to your email.
              Please check your inbox and enter the code below.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 dark:bg-gray-700/30 py-6 px-4 rounded-lg my-4">
            <InputOTP 
              maxLength={6} 
              value={otpValue} 
              onChange={setOtpValue}
              render={({ slots }) => (
                <InputOTPGroup className="gap-2 sm:gap-3">
                  {slots.map((slot, index) => (
                    <InputOTPSlot 
                      key={index} 
                      {...slot} 
                      className="w-10 h-12 sm:w-12 sm:h-14 border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-500 ring-primary-500 transition-all"
                    />
                  ))}
                </InputOTPGroup>
              )}
            />
          </div>

          <div className="text-center mt-1 mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">Didn't receive a code?</span>
            <button 
              type="button" 
              onClick={handleResendOtp}
              className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500 text-sm font-medium hover:opacity-80 ml-1"
            >
              Resend
            </button>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsVerifyModalOpen(false)}
              className="sm:mr-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleVerifyOtp}
              className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <Shield className="mr-2 h-4 w-4" />
              Verify Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}

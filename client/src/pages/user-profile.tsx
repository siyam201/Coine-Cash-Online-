import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  UpdateProfile, updateProfileSchema, 
  enable2FASchema, verify2FASchema,
  disable2FASchema, use2FARecoverySchema
} from "@shared/schema";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatCurrency } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from "@/components/ui/input-otp";
import { 
  ChevronLeft,
  User,
  Mail,
  Lock,
  CreditCard,
  Moon,
  Shield,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Key
} from "lucide-react";
import { ApiKeyManager } from "@/components/ApiKeyManager";

export default function UserProfile() {
  const [, navigate] = useLocation();
  const { user, updateProfileMutation } = useAuth();
  const [changePassword, setChangePassword] = useState(false);
  const [setup2faOpen, setSetup2faOpen] = useState(false);
  const [verify2faOpen, setVerify2faOpen] = useState(false);
  const [disable2faOpen, setDisable2faOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [passwordFor2fa, setPasswordFor2fa] = useState("");
  const [passwordForDisable2fa, setPasswordForDisable2fa] = useState("");
  const [showPasswordFor2fa, setShowPasswordFor2fa] = useState(false);
  const [showPasswordForDisable2fa, setShowPasswordForDisable2fa] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showStoredPassword, setShowStoredPassword] = useState(false);
  const [storedPassword, setStoredPassword] = useState("");
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [setupData, setSetupData] = useState<{
    qrCodeUrl: string;
    secret: string;
    recoveryCodes: string[];
  } | null>(null);
  const [copiedSecretIndex, setCopiedSecretIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Get 2FA status
  const { data: twoFAStatus } = useQuery({
    queryKey: ["/api/2fa/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/2fa/status");
      return await res.json();
    }
  });

  // Define a custom schema that extends UpdateProfile with confirmPassword
  const extendedSchema = updateProfileSchema.extend({
    confirmPassword: z.string().optional()
  });
  
  // Define the type based on the extended schema
  type ExtendedUpdateProfile = UpdateProfile & { confirmPassword?: string };
  
  const form = useForm<ExtendedUpdateProfile>({
    resolver: zodResolver(extendedSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: ExtendedUpdateProfile) => {
    // Remove confirmPassword as it's not in the API schema
    const { confirmPassword, ...updateData } = data;
    
    // Only include fields that have been changed
    const changedFields: Partial<UpdateProfile> = {};
    
    if (data.name && data.name !== user?.name) changedFields.name = data.name;
    if (data.email && data.email !== user?.email) changedFields.email = data.email;
    if (changePassword && data.newPassword) {
      changedFields.newPassword = data.newPassword;
    }
    
    // If form was submitted via the password-specific button, only update password
    if (changePassword && Object.keys(changedFields).length === 1 && changedFields.newPassword) {
      updateProfileMutation.mutate({ newPassword: changedFields.newPassword });
      
      // Reset password fields after submission
      setTimeout(() => {
        if (!updateProfileMutation.isPending) {
          form.resetField("newPassword");
          form.resetField("confirmPassword");
          setChangePassword(false);
        }
      }, 500);
      return;
    }
    
    // Only update if there are changes
    if (Object.keys(changedFields).length > 0) {
      updateProfileMutation.mutate(changedFields);
    }
  };

  // Set up 2FA mutation
  const setup2FAMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/2fa/setup", { password });
      return await res.json();
    },
    onSuccess: (data) => {
      setSetupData(data);
      setSetup2faOpen(false);
      setVerify2faOpen(true);
      setPasswordFor2fa("");
      toast({
        title: "Setup 2FA",
        description: "Scan the QR code with your authenticator app",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Setup 2FA failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify 2FA mutation
  const verify2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/2fa/verify", { code });
      return await res.json();
    },
    onSuccess: () => {
      setVerify2faOpen(false);
      setOtpValue("");
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled for your account",
      });
      // Refresh 2FA status
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: async ({ password, code }: { password: string; code: string }) => {
      const res = await apiRequest("POST", "/api/2fa/disable", { password, code });
      return await res.json();
    },
    onSuccess: () => {
      setDisable2faOpen(false);
      setOtpValue("");
      setPasswordForDisable2fa("");
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account",
      });
      // Refresh 2FA status
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Disable 2FA failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle copying recovery code
  const handleCopyRecoveryCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedSecretIndex(index);
    setTimeout(() => {
      setCopiedSecretIndex(null);
    }, 2000);
  };

  // Start 2FA setup process
  const handleSetup2FA = () => {
    if (!passwordFor2fa) {
      toast({
        title: "Password required",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }
    setup2FAMutation.mutate(passwordFor2fa);
  };

  // Verify 2FA setup
  const handleVerify2FA = () => {
    if (otpValue.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }
    verify2FAMutation.mutate(otpValue);
  };

  // Disable 2FA
  const handleDisable2FA = () => {
    if (!passwordForDisable2fa || otpValue.length !== 6) {
      toast({
        title: "Missing information",
        description: "Please enter your password and the 6-digit code",
        variant: "destructive",
      });
      return;
    }
    disable2FAMutation.mutate({ password: passwordForDisable2fa, code: otpValue });
  };

  const watchNewPassword = form.watch("newPassword");
  const watchConfirmPassword = form.watch("confirmPassword");
  
  const passwordsMatch = !watchNewPassword || !watchConfirmPassword || watchNewPassword === watchConfirmPassword;

  // Function to fetch stored password
  const fetchStoredPassword = async () => {
    try {
      setIsLoadingPassword(true);
      const res = await apiRequest("GET", "/api/user/password");
      const data = await res.json();
      setStoredPassword(data.password);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch your stored password",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPassword(false);
    }
  };
  
  // Clean up when leaving the page
  useEffect(() => {
    return () => {
      setStoredPassword("");
      setShowStoredPassword(false);
    };
  }, []);
  
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-3xl mx-auto pt-10 pb-20 px-4">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center text-gray-600 dark:text-gray-400 mb-6 hover:text-primary-500 dark:hover:text-primary-400"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          
          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'profile' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setActiveTab('profile')}
            >
              <User className="h-4 w-4 inline mr-2" />
              Profile
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'security' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setActiveTab('security')}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Security
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'api' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setActiveTab('api')}
            >
              <KeyRound className="h-4 w-4 inline mr-2" />
              API Keys
            </button>
          </div>
          
          {/* API Keys tab content */}
          {activeTab === 'api' && (
            <ApiKeyManager />
          )}
          
          {/* Profile tab content */}
          {activeTab === 'profile' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary-500" />
                  Profile Settings
                </CardTitle>
                <CardDescription>
                  Update your account settings and information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-primary-50 dark:bg-gray-800 rounded-md mb-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Current Balance</span>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {user ? formatCurrency(user.balance) : "-"}
                      </h3>
                    </div>
                    <Button 
                      variant="outline" 
                      className="mt-2 sm:mt-0"
                      onClick={() => navigate("/send-money")}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Send Money
                    </Button>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormDescription>
                            Changing your email will require verification
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Change Password</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setChangePassword(!changePassword)}
                      >
                        {changePassword ? "Cancel" : "Change"}
                      </Button>
                    </div>
                    
                    {changePassword && (
                      <>
                        <FormField
                          control={form.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <div className="relative">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type={showNewPassword ? "text" : "password"} 
                                  />
                                </FormControl>
                                <button
                                  type="button"
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                  {showNewPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              <FormDescription>
                                Use a password with at least 8 characters
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <div className="relative">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type={showConfirmPassword ? "text" : "password"} 
                                  />
                                </FormControl>
                                <button
                                  type="button"
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              {!passwordsMatch && (
                                <p className="text-sm font-medium text-destructive">Passwords don't match</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          disabled={!passwordsMatch || !watchNewPassword || !watchConfirmPassword || updateProfileMutation.isPending}
                          className="mt-4"
                        >
                          {updateProfileMutation.isPending ? "Saving..." : "Save Password"}
                        </Button>
                      </>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
                      </div>
                      <ThemeToggle />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
          
          {/* Security tab content */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary-500" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Enhance your account security with two-factor authentication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Stored Password section */}
                  <div className="pb-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-medium">Your Stored Password</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          View your stored password for reference
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          if (!storedPassword) {
                            fetchStoredPassword();
                          } else {
                            setStoredPassword("");
                          }
                        }}
                      >
                        {storedPassword ? "Hide Password" : "View Password"}
                      </Button>
                    </div>
                    
                    {storedPassword ? (
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                        <div className="flex justify-between items-center">
                          <div className="relative w-full">
                            <Input
                              type={showStoredPassword ? "text" : "password"}
                              value={storedPassword}
                              readOnly
                              className="pr-10 text-lg font-medium"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                              onClick={() => setShowStoredPassword(!showStoredPassword)}
                            >
                              {showStoredPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={() => {
                              navigator.clipboard.writeText(storedPassword);
                              toast({
                                title: "Copied",
                                description: "Password copied to clipboard",
                              });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : isLoadingPassword ? (
                      <div className="flex justify-center p-4">
                        <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div>
                      </div>
                    ) : null}
                  </div>
                  
                  {/* 2FA section */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Two-Factor Authentication (2FA)</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    {twoFAStatus?.enabled ? (
                      <Button 
                        variant="destructive" 
                        onClick={() => setDisable2faOpen(true)}
                      >
                        Disable 2FA
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        onClick={() => setSetup2faOpen(true)}
                      >
                        Enable 2FA
                      </Button>
                    )}
                  </div>
                  
                  {twoFAStatus?.enabled && (
                    <Alert>
                      <KeyRound className="h-4 w-4" />
                      <AlertTitle>Two-factor authentication is enabled</AlertTitle>
                      <AlertDescription>
                        Your account is protected with an additional layer of security.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Setup 2FA Dialog */}
          <Dialog open={setup2faOpen} onOpenChange={setSetup2faOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Enter your password to begin setting up two-factor authentication
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPasswordFor2fa ? "text" : "password"}
                      value={passwordFor2fa}
                      onChange={(e) => setPasswordFor2fa(e.target.value)}
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => setShowPasswordFor2fa(!showPasswordFor2fa)}
                    >
                      {showPasswordFor2fa ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSetup2faOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSetup2FA} disabled={setup2FAMutation.isPending}>
                  {setup2FAMutation.isPending ? "Setting up..." : "Continue"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Verify 2FA Dialog */}
          <Dialog open={verify2faOpen} onOpenChange={setVerify2faOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Verify Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Scan the QR code with your authenticator app and enter the code below
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {setupData?.qrCodeUrl && (
                  <div className="flex justify-center p-4">
                    <img
                      src={setupData.qrCodeUrl}
                      alt="2FA QR Code"
                      className="w-48 h-48 border p-2 rounded-md"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Verification Code</label>
                  <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                
                {setupData?.secret && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">
                      If you can't scan the QR code, enter this key manually in your authenticator app:
                    </p>
                    <div className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      <code className="flex-1 text-sm">{setupData.secret}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(setupData.secret);
                          toast({
                            title: "Copied",
                            description: "Secret key copied to clipboard",
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {setupData?.recoveryCodes && (
                  <div>
                    <p className="text-sm font-medium mb-2">Recovery Codes</p>
                    <p className="text-sm text-gray-500 mb-2">
                      Save these recovery codes in a secure location. You can use them to access your account if you
                      lose your 2FA device.
                    </p>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                      {setupData.recoveryCodes.map((code, index) => (
                        <div
                          key={code}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <code className="text-xs">{code}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopyRecoveryCode(code, index)}
                          >
                            {copiedSecretIndex === index ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVerify2faOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleVerify2FA} disabled={verify2FAMutation.isPending || otpValue.length !== 6}>
                  {verify2FAMutation.isPending ? "Verifying..." : "Enable 2FA"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Disable 2FA Dialog */}
          <Dialog open={disable2faOpen} onOpenChange={setDisable2faOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Enter your password and a verification code to disable 2FA
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="disable-password" className="text-sm font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="disable-password"
                      type={showPasswordForDisable2fa ? "text" : "password"}
                      value={passwordForDisable2fa}
                      onChange={(e) => setPasswordForDisable2fa(e.target.value)}
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => setShowPasswordForDisable2fa(!showPasswordForDisable2fa)}
                    >
                      {showPasswordForDisable2fa ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Verification Code</label>
                  <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDisable2faOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDisable2FA} 
                  disabled={disable2FAMutation.isPending}
                >
                  {disable2FAMutation.isPending ? "Disabling..." : "Disable 2FA"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ThemeProvider>
  );
}
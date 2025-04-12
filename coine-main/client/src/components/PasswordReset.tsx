import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";

// Email step schema for requesting reset code
const requestResetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Code + new password step schema
const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().length(6, "Verification code must be exactly 6 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RequestResetFormValues = z.infer<typeof requestResetSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function PasswordReset() {
  const { toast } = useToast();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form for requesting a password reset email
  const requestForm = useForm<RequestResetFormValues>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      email: "",
    },
  });

  // Form for entering the code and new password
  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Mutation for requesting a password reset
  const requestResetMutation = useMutation({
    mutationFn: async (data: RequestResetFormValues) => {
      const res = await apiRequest("POST", "/api/request-reset-password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Email Sent",
        description: "If your email is in our system, you will receive a code to reset your password",
      });
      setEmail(requestForm.getValues().email);
      setStep("reset");
      resetForm.setValue("email", requestForm.getValues().email);
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for resetting the password
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormValues) => {
      // We need to send only what the API expects
      const { confirmPassword, ...resetData } = data;
      const res = await apiRequest("POST", "/api/reset-password", resetData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Successful",
        description: "Your password has been reset. You can now log in with your new password.",
      });
      // Reset the form
      resetForm.reset();
      // Go back to the login step
      setStep("request");
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle request form submission
  const onRequestSubmit = (data: RequestResetFormValues) => {
    requestResetMutation.mutate(data);
  };

  // Handle reset form submission
  const onResetSubmit = (data: ResetPasswordFormValues) => {
    resetPasswordMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto border-0 shadow-lg">
      <div className="h-2 bg-gradient-to-r from-green-600 to-blue-600 rounded-t-lg"></div>
      <CardHeader>
        <CardTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-blue-600">Reset Your Password</CardTitle>
        <CardDescription>
          {step === "request"
            ? "Enter your email to receive a password reset code"
            : "Enter the code sent to your email and your new password"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "request" ? (
          <Form {...requestForm}>
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
              <FormField
                control={requestForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="you@example.com" 
                        {...field} 
                        disabled={requestResetMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-base relative overflow-hidden group transition-all duration-200 shadow-md hover:shadow-lg" 
                disabled={requestResetMutation.isPending}
              >
                <span className="absolute right-0 w-8 h-32 -mt-12 opacity-10 rotate-12 group-hover:translate-x-12 transition-transform duration-1000 bg-white"></span>
                <div className="flex items-center justify-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  {requestResetMutation.isPending ? "Sending..." : "Send Reset Code"}
                </div>
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="you@example.com" 
                        {...field} 
                        disabled={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resetForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reset Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter 6-digit code" 
                        {...field} 
                        disabled={resetPasswordMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resetForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showPassword ? "text" : "password"}
                          placeholder="New password" 
                          {...field} 
                          disabled={resetPasswordMutation.isPending}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resetForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your new password" 
                          {...field} 
                          disabled={resetPasswordMutation.isPending}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col space-y-2">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-base relative overflow-hidden group transition-all duration-200 shadow-md hover:shadow-lg" 
                  disabled={resetPasswordMutation.isPending}
                >
                  <span className="absolute right-0 w-8 h-32 -mt-12 opacity-10 rotate-12 group-hover:translate-x-12 transition-transform duration-1000 bg-white"></span>
                  <div className="flex items-center justify-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                  </div>
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full border-green-500/30 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors" 
                  onClick={() => setStep("request")}
                  disabled={resetPasswordMutation.isPending}
                >
                  <div className="flex items-center justify-center gap-2">
                    <ArrowLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Back to Email
                  </div>
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex justify-between text-sm">
        <Button
          variant="link"
          size="sm"
          className="px-0 text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-500 hover:opacity-80"
          onClick={() => window.history.back()}
        >
          ← Back to Login
        </Button>
      </CardFooter>
    </Card>
  );
}
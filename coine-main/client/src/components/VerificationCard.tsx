import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";

const verifyEmailSchema = z.object({
  code: z.string().min(6, "Verification code must be at least 6 characters").max(6, "Verification code must be 6 characters"),
});

type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;

export function VerificationCard() {
  const { user, verifyEmailMutation, requestVerificationCodeMutation, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [, navigate] = useLocation();

  const form = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      code: "",
    },
  });

  const onSubmit = (data: VerifyEmailFormValues) => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found. Please log out and try again.",
        variant: "destructive",
      });
      return;
    }
    
    verifyEmailMutation.mutate({
      email: user.email,
      code: data.code,
      purpose: "verification",
    });
  };

  const handleResendCode = () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found. Please log out and try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsResending(true);
    requestVerificationCodeMutation.mutate(
      {
        email: user.email,
        purpose: "verification",
      },
      {
        onSettled: () => {
          setIsResending(false);
        },
      }
    );
  };

  // Function to handle logout
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged out",
          description: "You have been logged out successfully.",
        });
        navigate("/auth");
      },
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Email Verification Required</CardTitle>
        <CardDescription className="text-center">
          Please verify your email address to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-md overflow-hidden">
            <img src="/images/logo.png" alt="Coine Cash Online Logo" className="h-16 w-16" />
          </div>
        </div>
        
        <p className="text-center text-sm text-muted-foreground mb-6">
          We have sent a verification code to <strong>{user?.email}</strong>.
          Please enter the code below to verify your email address.
        </p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter 6-digit code"
                      {...field}
                      className="text-center text-xl tracking-widest"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={verifyEmailMutation.isPending}
            >
              {verifyEmailMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Email
            </Button>
          </form>
        </Form>
        
        {/* Logout button */}
        <div className="mt-4 text-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <LogOut className="h-4 w-4" />
            Logout and return to login
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button 
          variant="ghost" 
          onClick={handleResendCode}
          disabled={isResending || requestVerificationCodeMutation.isPending}
        >
          {(isResending || requestVerificationCodeMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Resend Verification Code
        </Button>
      </CardFooter>
    </Card>
  );
}
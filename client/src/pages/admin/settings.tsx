import React, { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Database, Mail } from "lucide-react";

export default function AdminSettings(): React.ReactElement {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [securitySettings, setSecuritySettings] = useState<{
    requireTwoFactorForAdmins: boolean;
    passwordMinLength: number | string;
    sessionTimeoutMinutes: number | string;
    maxLoginAttempts: number | string;
  }>({
    requireTwoFactorForAdmins: true,
    passwordMinLength: 8,
    sessionTimeoutMinutes: 30,
    maxLoginAttempts: 5,
  });

  const [emailSettings, setEmailSettings] = useState({
    senderName: "Coine Cash Online",
    senderEmail: "authotp247@gmail.com",
    sendWelcomeEmail: true,
    sendTransactionNotifications: true,
    sendLowBalanceWarnings: true,
  });

  const [systemSettings, setSystemSettings] = useState<{
    maintenanceMode: boolean;
    debugMode: boolean;
    initialBalance: number | string;
    minTransactionAmount: number | string;
    maxTransactionAmount: number | string;
  }>({
    maintenanceMode: false,
    debugMode: false,
    initialBalance: 1000,
    minTransactionAmount: 50,
    maxTransactionAmount: 10000,
  });

  // Handle form submissions
  const handleSaveSecuritySettings = async () => {
    try {
      setIsUpdating(true);
      
      // Convert string values to numbers for sending to the API
      const dataToSend = {
        ...securitySettings,
        passwordMinLength: typeof securitySettings.passwordMinLength === 'string' 
          ? parseInt(securitySettings.passwordMinLength) 
          : securitySettings.passwordMinLength,
        sessionTimeoutMinutes: typeof securitySettings.sessionTimeoutMinutes === 'string' 
          ? parseInt(securitySettings.sessionTimeoutMinutes) 
          : securitySettings.sessionTimeoutMinutes,
        maxLoginAttempts: typeof securitySettings.maxLoginAttempts === 'string' 
          ? parseInt(securitySettings.maxLoginAttempts) 
          : securitySettings.maxLoginAttempts
      };
      
      // Save the security settings to backend API
      const response = await fetch('/api/admin/settings/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      if (response.ok) {
        toast({
          title: "Security Settings Updated",
          description: "Your security settings have been successfully saved.",
        });
      } else {
        throw new Error('Failed to save security settings');
      }
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast({
        title: "Failed to Update",
        description: "There was an error updating security settings.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    try {
      setIsUpdating(true);
      // Save the email settings to backend API
      const response = await fetch('/api/admin/settings/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailSettings),
      });
      
      if (response.ok) {
        toast({
          title: "Email Settings Updated",
          description: "Your email settings have been successfully saved.",
        });
      } else {
        throw new Error('Failed to save email settings');
      }
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast({
        title: "Failed to Update",
        description: "There was an error updating email settings.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      setIsUpdating(true);
      
      // Convert string values to numbers for sending to the API
      const dataToSend = {
        ...systemSettings,
        initialBalance: typeof systemSettings.initialBalance === 'string' 
          ? parseFloat(systemSettings.initialBalance) 
          : systemSettings.initialBalance,
        minTransactionAmount: typeof systemSettings.minTransactionAmount === 'string' 
          ? parseFloat(systemSettings.minTransactionAmount) 
          : systemSettings.minTransactionAmount,
        maxTransactionAmount: typeof systemSettings.maxTransactionAmount === 'string' 
          ? parseFloat(systemSettings.maxTransactionAmount) 
          : systemSettings.maxTransactionAmount
      };
      
      // Save the system settings to backend API
      const response = await fetch('/api/admin/settings/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      if (response.ok) {
        toast({
          title: "System Settings Updated",
          description: "Your system settings have been successfully saved.",
        });
      } else {
        throw new Error('Failed to save system settings');
      }
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast({
        title: "Failed to Update",
        description: "There was an error updating system settings.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AdminLayout title="Admin Settings">
      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Settings
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Configuration
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            System Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Security Settings Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>
                Manage security settings for all users of the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="requireTwoFactorForAdmins">Require 2FA for Admins</Label>
                  <Switch
                    id="requireTwoFactorForAdmins"
                    checked={securitySettings.requireTwoFactorForAdmins}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({
                        ...securitySettings,
                        requireTwoFactorForAdmins: checked,
                      })
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Force all admin users to enable two-factor authentication
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                <Input
                  id="passwordMinLength"
                  type="number"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      passwordMinLength: e.target.value === '' ? '' : parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Set the minimum required length for user passwords
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sessionTimeoutMinutes">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeoutMinutes"
                  type="number"
                  value={securitySettings.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      sessionTimeoutMinutes: e.target.value === '' ? '' : parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Time before an inactive user is automatically logged out
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Maximum Login Attempts</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      maxLoginAttempts: e.target.value === '' ? '' : parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Number of failed login attempts before account is temporarily locked
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveSecuritySettings} 
                disabled={isUpdating}
                className="ml-auto"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Security Settings"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Email Settings Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>
                Configure email settings and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senderName">Sender Name</Label>
                <Input
                  id="senderName"
                  value={emailSettings.senderName}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      senderName: e.target.value,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Name that appears in the "From" field of emails
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="senderEmail">Sender Email</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  value={emailSettings.senderEmail}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      senderEmail: e.target.value,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Email address used to send emails from the system
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sendWelcomeEmail">Send Welcome Email</Label>
                  <Switch
                    id="sendWelcomeEmail"
                    checked={emailSettings.sendWelcomeEmail}
                    onCheckedChange={(checked) =>
                      setEmailSettings({
                        ...emailSettings,
                        sendWelcomeEmail: checked,
                      })
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Send a welcome email to new users after registration
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sendTransactionNotifications">Transaction Notifications</Label>
                  <Switch
                    id="sendTransactionNotifications"
                    checked={emailSettings.sendTransactionNotifications}
                    onCheckedChange={(checked) =>
                      setEmailSettings({
                        ...emailSettings,
                        sendTransactionNotifications: checked,
                      })
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Send email notifications for transactions
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sendLowBalanceWarnings">Low Balance Warnings</Label>
                  <Switch
                    id="sendLowBalanceWarnings"
                    checked={emailSettings.sendLowBalanceWarnings}
                    onCheckedChange={(checked) =>
                      setEmailSettings({
                        ...emailSettings,
                        sendLowBalanceWarnings: checked,
                      })
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Alert users when their balance falls below a certain threshold
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveEmailSettings} 
                disabled={isUpdating}
                className="ml-auto"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Email Settings"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* System Settings Tab */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>
                Configure core system settings and parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                  <Switch
                    id="maintenanceMode"
                    checked={systemSettings.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setSystemSettings({
                        ...systemSettings,
                        maintenanceMode: checked,
                      })
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable maintenance mode to temporarily disable access to the platform
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="debugMode">Debug Mode</Label>
                  <Switch
                    id="debugMode"
                    checked={systemSettings.debugMode}
                    onCheckedChange={(checked) =>
                      setSystemSettings({
                        ...systemSettings,
                        debugMode: checked,
                      })
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable additional logging and debugging information
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="initialBalance">Initial Balance</Label>
                <Input
                  id="initialBalance"
                  type="number"
                  value={systemSettings.initialBalance}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      initialBalance: e.target.value === '' ? '' : parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Default starting balance for new user accounts
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minTransactionAmount">Minimum Transaction Amount</Label>
                <Input
                  id="minTransactionAmount"
                  type="number"
                  value={systemSettings.minTransactionAmount}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      minTransactionAmount: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Smallest amount that can be transferred in a transaction
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxTransactionAmount">Maximum Transaction Amount</Label>
                <Input
                  id="maxTransactionAmount"
                  type="number"
                  value={systemSettings.maxTransactionAmount}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      maxTransactionAmount: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Largest amount that can be transferred in a single transaction
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveSystemSettings} 
                disabled={isUpdating}
                className="ml-auto"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save System Settings"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
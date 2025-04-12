import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import SendMoney from "@/pages/send-money";
import TransactionHistory from "@/pages/transaction-history";
import UserProfile from "@/pages/user-profile";
import ResetPasswordPage from "@/pages/reset-password";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminTransactions from "@/pages/admin/transactions";
import AdminSettings from "@/pages/admin/settings";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { VerificationCard } from "@/components/VerificationCard";
// Removed unused imports

function Router() {
  const { user, verificationRequired, isLoading } = useAuth();
  // Remove loading state and timer
  
  console.log("Router: Ready to render", { user, verificationRequired });
  
  // If user exists and verification is required or user is not verified, show verification screen
  if (user && (verificationRequired || user.isVerified === false)) {
    console.log("Router: Showing verification card");
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
        <VerificationCard />
      </div>
    );
  }
  
  // If no user is logged in and we're on the root path, redirect to auth page
  if (!user && window.location.pathname === '/') {
    console.log("No user found on root path, redirecting to auth page");
    return <Redirect to="/auth" />;
  }
  
  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      
      {/* User Routes */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/send-money" component={SendMoney} />
      <ProtectedRoute path="/transactions" component={TransactionHistory} />
      <ProtectedRoute path="/transaction-history" component={TransactionHistory} />
      <ProtectedRoute path="/profile" component={UserProfile} />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} adminOnly />
      <ProtectedRoute path="/admin/users" component={AdminUsers} adminOnly />
      <ProtectedRoute path="/admin/transactions" component={AdminTransactions} adminOnly />
      <ProtectedRoute path="/admin/settings" component={AdminSettings} adminOnly />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Explicitly creating queryClient instance in App component
  const queryClientInstance = queryClient;
  
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

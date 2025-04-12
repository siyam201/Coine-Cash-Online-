import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { VerificationCard } from "@/components/VerificationCard";

export function ProtectedRoute({
  path,
  component: Component,
  adminOnly = false,
}: {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
}) {
  const { user, isLoading, verificationRequired } = useAuth();
  console.log("ProtectedRoute:", { path, user, isLoading, verificationRequired });

  if (isLoading) {
    console.log("ProtectedRoute: Still loading");
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log("ProtectedRoute: No user, redirecting to auth");
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  // If user is not verified, show verification card directly here
  // instead of redirecting to root
  if (user.isVerified === false) {
    console.log("ProtectedRoute: User not verified, showing verification card");
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
          <VerificationCard />
        </div>
      </Route>
    );
  }

  if (adminOnly && user.isAdmin !== true) {
    console.log("ProtectedRoute: Admin only route, but user is not admin");
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  console.log("ProtectedRoute: Rendering component for path", path);
  return <Route path={path} component={Component} />;
}

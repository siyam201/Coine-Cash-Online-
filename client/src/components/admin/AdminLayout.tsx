import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { 
  Home, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  ShieldCheck,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AdminLayoutProps = {
  children: ReactNode;
  title: string;
};

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { 
      href: "/admin", 
      label: "Dashboard", 
      icon: LayoutDashboard 
    },
    { 
      href: "/admin/users", 
      label: "User Management", 
      icon: Users 
    },
    { 
      href: "/admin/transactions", 
      label: "Transaction Monitoring", 
      icon: BarChart3 
    },
    { 
      href: "/admin/settings", 
      label: "Settings", 
      icon: Settings 
    },
  ];
  
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        {/* Admin Header */}
        <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary-500">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    <path d="M12.31 11.14c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
                  </svg>
                  <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Coine Cash Online</span>
                  <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded-md text-sm font-medium">Admin Panel</span>
                </div>
              </div>
              <div className="flex items-center">
                <Button variant="ghost" onClick={() => window.location.href = "/"}>
                  User Dashboard
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content with Sidebar */}
        <div className="flex-1 flex overflow-hidden bg-gray-100 dark:bg-gray-900">
          {/* Sidebar for Desktop */}
          <aside className="hidden md:flex md:flex-shrink-0">
            <div className="w-64 flex flex-col">
              <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                  <nav className="flex-1 px-2 space-y-1">
                    {navItems.map((item) => {
                      const isActive = location === item.href;
                      const Icon = item.icon;
                      
                      return (
                        <Link 
                          key={item.href} 
                          href={item.href}
                        >
                          <a className={cn(
                            "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                            isActive 
                              ? "bg-primary-50 text-primary-700 dark:bg-gray-700 dark:text-white" 
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                          )}>
                            <Icon 
                              className={cn(
                                "mr-3 text-xl",
                                isActive 
                                  ? "text-primary-500" 
                                  : "text-gray-400 dark:text-gray-500"
                              )} 
                            />
                            {item.label}
                          </a>
                        </Link>
                      );
                    })}
                    
                    {/* Logout button */}
                    <button 
                      onClick={handleLogout}
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-gray-700 w-full text-left"
                    >
                      <LogOut className="mr-3 text-xl text-red-400 dark:text-red-500" />
                      Logout
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </aside>
          
          {/* Main Admin Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">{title}</h1>
                {children}
              </div>
            </div>
          </main>
        </div>
        
        {/* Mobile Navigation */}
        <nav className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 fixed bottom-0 w-full">
          <div className="grid grid-cols-4 h-16">
            {navItems.slice(0, 4).map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <a className="flex flex-col items-center justify-center text-xs font-medium">
                    <Icon 
                      className={cn(
                        "h-6 w-6",
                        isActive 
                          ? "text-primary-500" 
                          : "text-gray-400 dark:text-gray-500"
                      )} 
                    />
                    <span className={cn(
                      "mt-1",
                      isActive 
                        ? "text-primary-500" 
                        : "text-gray-500 dark:text-gray-400"
                    )}>
                      {item.label}
                    </span>
                  </a>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </ThemeProvider>
  );
}

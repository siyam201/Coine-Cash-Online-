import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { ThemeProvider } from "@/hooks/use-theme";
import { 
  Home, 
  History, 
  CreditCard, 
  User, 
  LogOut, 
  Send, 
  ChevronDown,
  PlusCircle,
  MinusCircle,
  ChevronRight,
  UserCircle,
  DollarSign,
  BarChart3,
  Wallet,
  RefreshCw,
  TrendingUp,
  Activity,
  Shield
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@shared/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  
  // Fetch recent transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    select: (data) => data.slice(0, 4), // Only show the 4 most recent transactions
  });

  // Fetch balance separately with auto-refresh
  const { refetch: refetchBalance } = useQuery({
    queryKey: ['/api/user/balance'],
    enabled: !!user?.id,
    onSuccess: () => {
      setLastRefreshTime(new Date());
      setIsRefreshingBalance(false);
    },
    onError: () => {
      setIsRefreshingBalance(false);
    }
  });

  // Auto-refresh every 3 seconds
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(() => {
      setIsRefreshingBalance(true);
      refetchBalance();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [user?.id, refetchBalance]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => navigate("/auth")
    });
  };

  const handleManualRefresh = () => {
    setIsRefreshingBalance(true);
    refetchBalance();
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 transition-colors duration-200">
        {/* Top Navigation */}
        <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary-500">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    <path d="M12.31 11.14c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
                  </svg>
                  <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-700 dark:from-primary-400 dark:to-primary-600">Coine Cash Online</span>
                </div>
                
                {/* Desktop Navigation Menu */}
                <nav className="hidden md:ml-6 md:flex md:space-x-4">
                  <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-gray-700">
                    Dashboard
                  </Link>
                  <Link href="/transactions" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-gray-700">
                    Transactions
                  </Link>
                  <Link href="/send-money" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-gray-700">
                    Send Money
                  </Link>
                </nav>
              </div>
              <div className="flex items-center">
                {/* User is verified badge */}
                {user?.isVerified && (
                  <Badge variant="outline" className="mr-3 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label="User menu"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center overflow-hidden">
                        <UserCircle className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <span className="hidden md:block font-medium text-gray-900 dark:text-white">
                        {user?.name}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 py-2">
                    <div className="px-2 py-1.5 text-sm font-medium text-gray-900 dark:text-white">
                      Account
                    </div>
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/transactions")} className="cursor-pointer">
                      <History className="mr-2 h-4 w-4" />
                      <span>Transaction History</span>
                    </DropdownMenuItem>
                    {user?.isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-sm font-medium text-gray-900 dark:text-white">
                          Admin
                        </div>
                        <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          <span>Admin Panel</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto transition-colors duration-200">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl shadow-lg mb-8 overflow-hidden">
                <div className="relative p-6 sm:p-8">
                  {/* Background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <svg className="h-full w-full" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <circle cx="20" cy="20" r="2" fill="currentColor" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#pattern)" />
                    </svg>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white">
                        Welcome, {user?.name?.split(' ')[0]}!
                      </h2>
                      <p className="mt-2 text-primary-100">Manage your Coine Cash Online account with ease</p>
                      <div className="mt-4">
                        <Button 
                          onClick={() => navigate("/send-money")} 
                          variant="secondary" 
                          className="bg-white text-primary-600 hover:bg-primary-50 font-medium shadow-md hover:shadow-lg transition-all duration-200 border-0"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Send Money
                        </Button>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center space-x-2 mt-4 md:mt-0">
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-white/20 animate-pulse"></div>
                        <div className="relative bg-white/10 p-4 backdrop-blur-sm rounded-full overflow-hidden">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-16 w-16 text-yellow-400">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                            <path d="M12.31 11.14c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Grid Layout for Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Balance Card */}
                <Card className="md:col-span-2 shadow-md border-0 hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-blue-600 h-2"></div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl flex items-center">
                          <DollarSign className="mr-2 h-5 w-5 text-green-500" />
                          Current Balance
                        </CardTitle>
                        <CardDescription>
                          Your available funds
                        </CardDescription>
                      </div>
                      <Button 
                        onClick={handleManualRefresh} 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400"
                        disabled={isRefreshingBalance}
                      >
                        {isRefreshingBalance ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                          {user ? formatCurrency(user.balance) : <Skeleton className="h-10 w-40" />}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {lastRefreshTime ? `Updated ${formatRelativeTime(lastRefreshTime)}` : 'Loading...'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => navigate("/send-money")}
                          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                          size="sm"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Transaction Summary Card */}
                <Card className="shadow-md border-0 hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-blue-600 h-2"></div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl flex items-center">
                      <Activity className="mr-2 h-5 w-5 text-green-500" />
                      Transaction Summary
                    </CardTitle>
                    <CardDescription>
                      Recent activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 bg-green-100 dark:bg-green-800 rounded-full p-2 mr-3">
                            <PlusCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Incoming</p>
                        </div>
                        {transactions ? (
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(
                              transactions
                                .filter(t => t.receiverId === user?.id)
                                .reduce((sum, t) => sum + t.amount, 0)
                            )}
                          </p>
                        ) : (
                          <Skeleton className="h-6 w-20" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 bg-red-100 dark:bg-red-800 rounded-full p-2 mr-3">
                            <MinusCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Outgoing</p>
                        </div>
                        {transactions ? (
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(
                              transactions
                                .filter(t => t.senderId === user?.id)
                                .reduce((sum, t) => sum + t.amount, 0)
                            )}
                          </p>
                        ) : (
                          <Skeleton className="h-6 w-20" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Recent Transactions */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <RefreshCw className="mr-2 h-5 w-5 text-green-500" />
                    Recent Transactions
                  </h3>
                  <Link 
                    href="/transactions"
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                  >
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
                
                <Card className="shadow-md border-0 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-blue-600 h-2"></div>
                  {isLoadingTransactions ? (
                    <CardContent className="p-0">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <div className="flex items-center space-x-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1">
                              <Skeleton className="h-4 w-40 mb-2" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-6 w-20" />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  ) : transactions && transactions.length > 0 ? (
                    <CardContent className="p-0">
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {transactions.map(transaction => {
                          const isSender = transaction.senderId === user?.id;
                          return (
                            <li key={transaction.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                  <div className={`h-12 w-12 rounded-full ${
                                    isSender 
                                      ? 'bg-red-100 dark:bg-red-900/70' 
                                      : 'bg-green-100 dark:bg-green-900/70'
                                  } flex items-center justify-center`}>
                                    {isSender ? (
                                      <MinusCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                    ) : (
                                      <PlusCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {isSender 
                                        ? `${transaction.receiverId ? 'Payment sent' : 'Withdrawal'}`
                                        : 'Payment received'}
                                    </span>
                                    <Badge 
                                      variant="outline" 
                                      className="ml-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                    >
                                      {transaction.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatDate(transaction.createdAt)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-lg font-bold ${
                                    isSender ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    {isSender ? '-' : '+'}{formatCurrency(transaction.amount)}
                                  </p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  ) : (
                    <CardContent className="py-10 text-center">
                      <div className="flex flex-col items-center">
                        <RefreshCw className="h-10 w-10 text-gray-400 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No transactions found</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                          Your transaction history will appear here
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </main>
        
        {/* Bottom Navigation for Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden z-50 shadow-lg">
          <div className="max-w-7xl mx-auto px-2">
            <div className="flex justify-between">
              <Link 
                href="/" 
                className="group flex flex-col items-center py-3 px-3 text-primary-600 dark:text-primary-400"
              >
                <div className="p-1 rounded-full bg-primary-50 dark:bg-primary-900/30">
                  <Home className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1 font-medium">Home</span>
              </Link>
              <Link 
                href="/transactions" 
                className="group flex flex-col items-center py-3 px-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              >
                <div className="p-1 rounded-full bg-gray-50 dark:bg-gray-700">
                  <History className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1 font-medium">History</span>
              </Link>
              <Link 
                href="/send-money" 
                className="group flex flex-col items-center py-3 px-2"
              >
                <div className="-mt-8 mb-1 bg-gradient-to-r from-green-500 to-blue-600 rounded-full p-3 shadow-lg text-white">
                  <Send className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400">Send</span>
              </Link>
              <Link 
                href="/profile" 
                className="group flex flex-col items-center py-3 px-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              >
                <div className="p-1 rounded-full bg-gray-50 dark:bg-gray-700">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-xs mt-1 font-medium">Profile</span>
              </Link>
              <button 
                onClick={() => document.body.classList.toggle('dark')}
                className="group flex flex-col items-center py-3 px-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              >
                <div className="p-1 rounded-full bg-gray-50 dark:bg-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path className="dark:hidden" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd" />
                    <path className="hidden dark:block" d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                </div>
                <span className="text-xs mt-1 font-medium">Theme</span>
              </button>
            </div>
          </div>
        </nav>
        {/* Mobile padding to prevent content from being hidden behind fixed navbar */}
        <div className="h-20 md:hidden"></div>
      </div>
    </ThemeProvider>
  );
}

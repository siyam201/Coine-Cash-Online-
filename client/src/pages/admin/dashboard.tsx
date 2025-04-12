import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { MaintenanceTools } from "@/components/admin/MaintenanceTools";
import { Transaction, User } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminDashboard() {
  // Fetch users data
  const { 
    data: users, 
    isLoading: isLoadingUsers 
  } = useQuery<User[]>({ 
    queryKey: ["/api/admin/users"] 
  });
  
  // Fetch transactions data
  const { 
    data: transactions, 
    isLoading: isLoadingTransactions 
  } = useQuery<Transaction[]>({ 
    queryKey: ["/api/admin/transactions"] 
  });
  
  // Create chart data - transactions by day
  const getTransactionChartData = () => {
    if (!transactions) return [];
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    // Get transactions for the last 7 days
    const recentTransactions = transactions.filter(
      t => new Date(t.createdAt) >= lastWeek
    );
    
    // Group by day
    const groupedByDay = recentTransactions.reduce((acc, transaction) => {
      const date = new Date(transaction.createdAt);
      const day = date.toLocaleDateString('bn-BD', { weekday: 'short' });
      
      if (!acc[day]) {
        acc[day] = { 
          count: 0, 
          amount: 0 
        };
      }
      
      acc[day].count += 1;
      acc[day].amount += transaction.amount;
      
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);
    
    // Convert to array for chart
    return Object.entries(groupedByDay).map(([day, data]) => ({
      day,
      count: data.count,
      amount: data.amount,
    }));
  };
  
  // Get recent users
  const recentUsers = users?.slice(0, 5);
  
  // Get recent transactions
  const recentTransactions = transactions?.slice(0, 5);
  
  // Get user by ID helper
  const getUserById = (userId: number | null) => {
    if (!userId || !users) return null;
    return users.find(user => user.id === userId);
  };
  
  return (
    <AdminLayout title="ড্যাশবোর্ড">
      {/* Stats Cards */}
      <DashboardStats 
        users={users} 
        transactions={transactions} 
        isLoading={isLoadingUsers || isLoadingTransactions}
      />
      
      {/* Charts and Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Transaction Chart */}
        <Card>
          <CardHeader>
            <CardTitle>সাম্প্রতিক লেনদেন পরিসংখ্যান</CardTitle>
            <CardDescription>বিগত ৭ দিনের লেনদেন অ্যাক্টিভিটি</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getTransactionChartData()} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                  <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="লেনদেন সংখ্যা" fill="#3B82F6" />
                  <Bar yAxisId="right" dataKey="amount" name="লেনদেন পরিমাণ" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>সাম্প্রতিক ইউজাররা</CardTitle>
            <CardDescription>সর্বশেষ যোগ হওয়া ইউজাররা</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentUsers && recentUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>নাম</TableHead>
                    <TableHead>ইমেইল</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>ব্যালেন্স</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.isBlocked ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            ব্লকড
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            সক্রিয়
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(user.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                কোন ইউজার পাওয়া যায়নি
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* System Maintenance Tools */}
      <div className="mb-8">
        <MaintenanceTools />
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>সাম্প্রতিক লেনদেন</CardTitle>
          <CardDescription>সর্বশেষ লেনদেন অ্যাক্টিভিটি</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentTransactions && recentTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>আইডি</TableHead>
                  <TableHead>সেন্ডার</TableHead>
                  <TableHead>রিসিভার</TableHead>
                  <TableHead>পরিমাণ</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>তারিখ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((transaction) => {
                  const sender = getUserById(transaction.senderId);
                  const receiver = getUserById(transaction.receiverId || 0);
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">#{transaction.id}</TableCell>
                      <TableCell>{sender?.name || "-"}</TableCell>
                      <TableCell>{receiver?.name || "-"}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              কোন লেনদেন পাওয়া যায়নি
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

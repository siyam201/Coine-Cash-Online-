import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { TransactionTable } from "@/components/admin/TransactionTable";
import { Transaction, User } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from "recharts";

export default function AdminTransactions() {
  // Fetch transactions data
  const { 
    data: transactions, 
    isLoading: isLoadingTransactions 
  } = useQuery<Transaction[]>({ 
    queryKey: ["/api/admin/transactions"] 
  });
  
  // Fetch users data for user details
  const { 
    data: users, 
    isLoading: isLoadingUsers 
  } = useQuery<User[]>({ 
    queryKey: ["/api/admin/users"] 
  });
  
  // Calculate transaction statistics
  const totalTransactions = transactions?.length || 0;
  const totalAmount = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
  
  // Group transactions by amount ranges for pie chart
  const getTransactionRangeData = () => {
    if (!transactions) return [];
    
    const ranges = [
      { name: "< ১,০০০", range: [0, 1000], color: "#10B981" },
      { name: "১,০০০-৫,০০০", range: [1000, 5000], color: "#3B82F6" },
      { name: "৫,০০০-১০,০০০", range: [5000, 10000], color: "#F59E0B" },
      { name: "> ১০,০০০", range: [10000, Infinity], color: "#EF4444" },
    ];
    
    return ranges.map(({ name, range, color }) => {
      const count = transactions.filter(t => 
        t.amount >= range[0] && t.amount < range[1]
      ).length;
      
      return {
        name,
        value: count,
        color
      };
    });
  };
  
  // Find highest value transaction
  const highestTransaction = transactions?.reduce((highest, t) => 
    t.amount > highest.amount ? t : highest, 
    { amount: 0 } as Transaction
  );
  
  return (
    <AdminLayout title="ট্রান্সেকশন মনিটরিং">
      {/* Transaction Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">মোট ট্রান্সেকশন</p>
              <p className="text-3xl font-semibold">{totalTransactions}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">মোট পরিমাণ</p>
              <p className="text-3xl font-semibold">{formatCurrency(totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">গড় পরিমাণ</p>
              <p className="text-3xl font-semibold">{formatCurrency(averageAmount)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">সর্বোচ্চ লেনদেন</p>
              <p className="text-3xl font-semibold">{highestTransaction ? formatCurrency(highestTransaction.amount) : "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Transaction Range Chart and Table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>ট্রান্সেকশন রেঞ্জ</CardTitle>
            <CardDescription>ট্রান্সেকশন পরিমাণের ভিত্তিতে বিভাজন</CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            {isLoadingTransactions ? (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-gray-500 dark:text-gray-400">লোড হচ্ছে...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getTransactionRangeData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getTransactionRangeData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} টি ট্রান্সেকশন`, "সংখ্যা"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>ট্রান্সেকশন সামারি</CardTitle>
            <CardDescription>ট্রান্সেকশন পরিসংখ্যান এবং বিশ্লেষণ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="font-medium">মোট ট্রান্সেকশন সংখ্যা</span>
                <span>{totalTransactions} টি</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="font-medium">গড় ট্রান্সেকশন পরিমাণ</span>
                <span>{formatCurrency(averageAmount)}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="font-medium">সম্ভাব্য সন্দেহজনক ট্রান্সেকশন</span>
                <span>{transactions?.filter(t => t.amount > 8000).length || 0} টি</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="font-medium">১০,০০০ এর বেশি লেনদেন</span>
                <span>{transactions?.filter(t => t.amount > 10000).length || 0} টি</span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="font-medium">বড় অঙ্কের লেনদেন শতাংশ</span>
                <span>
                  {totalTransactions > 0 
                    ? ((transactions?.filter(t => t.amount > 5000).length || 0) / totalTransactions * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Transaction Monitoring Table */}
      <Card>
        <CardHeader>
          <CardTitle>ট্রান্সেকশন মনিটরিং</CardTitle>
          <CardDescription>সকল ট্রান্সেকশন দেখুন এবং ফিল্টার করুন</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionTable 
            transactions={transactions} 
            users={users} 
            isLoading={isLoadingTransactions || isLoadingUsers} 
          />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

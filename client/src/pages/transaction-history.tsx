import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ThemeProvider } from "@/hooks/use-theme";
import { Transaction } from "@shared/schema";
import { 
  ChevronLeft,
  PlusCircle,
  MinusCircle,
  Search,
  ChevronDown
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type TransactionType = "all" | "sent" | "received";

export default function TransactionHistory() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [transactionType, setTransactionType] = useState<TransactionType>("all");
  
  // Fetch transactions
  const { data: transactions, isLoading } = useQuery<(Transaction & { senderEmail?: string; receiverEmail?: string })[]>({
    queryKey: ["/api/transactions", searchQuery],
    queryFn: async ({ queryKey }) => {
      const [path, search] = queryKey;
      let url = path as string;
      
      // If there's a search query and it looks like an email, use the email search endpoint
      if (search && typeof search === 'string' && search.includes('@')) {
        url = `${path}?emailSearch=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
  });

  // Fetch users for email search (needed to search by email)
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.isAdmin === true, // Only fetch if user is admin
  });

  // Filter transactions based on search and type
  const filteredTransactions = transactions?.filter(transaction => {
    // Filter by type
    if (transactionType === "sent" && transaction.senderId !== user?.id) return false;
    if (transactionType === "received" && transaction.receiverId !== user?.id) return false;
    
    // Filter by search query (transaction ID, amount, note, or email)
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      
      // Basic search for all users
      const basicMatch = 
        transaction.id.toString().includes(searchLower) ||
        transaction.amount.toString().includes(searchLower) ||
        (transaction.note && transaction.note.toLowerCase().includes(searchLower));
      
      if (basicMatch) return true;
      
      // Email search for admins only - they have access to all user data
      if (users && user?.isAdmin) {
        // Find sender and receiver emails
        const sender = users.find(u => u.id === transaction.senderId);
        const receiver = users.find(u => u.id === transaction.receiverId);
        
        // Check if search query matches either email
        return (
          (sender?.email && sender.email.toLowerCase().includes(searchLower)) ||
          (receiver?.email && receiver.email.toLowerCase().includes(searchLower))
        );
      }
      
      // For regular users, allow searching via enriched transaction emails
      // Check if transaction has senderEmail or receiverEmail properties
      if ((transaction as any).senderEmail || (transaction as any).receiverEmail) {
        const senderEmail = (transaction as any).senderEmail || '';
        const receiverEmail = (transaction as any).receiverEmail || '';
        
        if (senderEmail.toLowerCase().includes(searchLower) || 
            receiverEmail.toLowerCase().includes(searchLower)) {
          return true;
        }
      }
      
      return false;
    }
    
    return true;
  });

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto pt-10 pb-20 px-4 sm:px-6 lg:px-8">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center text-gray-600 dark:text-gray-400 mb-6 hover:text-primary-500 dark:hover:text-primary-400"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search transactions..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select
                  value={transactionType}
                  onValueChange={(value) => setTransactionType(value as TransactionType)}
                >
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="sent">Money Sent</SelectItem>
                    <SelectItem value="received">Money Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4">
                  <Skeleton className="h-10 w-full mb-4" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full mb-2" />
                  ))}
                </div>
              ) : filteredTransactions && filteredTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => {
                        const isSender = transaction.senderId === user?.id;
                        
                        // Find related emails if available (for admins)
                        let senderEmail, receiverEmail;
                        if (users && user?.isAdmin) {
                          const sender = users.find(u => u.id === transaction.senderId);
                          const receiver = users.find(u => u.id === transaction.receiverId);
                          senderEmail = sender?.email;
                          receiverEmail = receiver?.email;
                        }
                        
                        // Use enriched email data if available
                        if (transaction.senderEmail) {
                          senderEmail = transaction.senderEmail;
                        }
                        if (transaction.receiverEmail) {
                          receiverEmail = transaction.receiverEmail;
                        }
                        
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">#{transaction.id}</TableCell>
                            <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                            <TableCell className={isSender ? "text-red-500" : "text-green-500"}>
                              {isSender ? "-" : "+"}{formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className={`mr-2 p-1 rounded-full ${
                                  isSender 
                                    ? "bg-red-100 dark:bg-red-900" 
                                    : "bg-green-100 dark:bg-green-900"
                                }`}>
                                  {isSender ? (
                                    <MinusCircle className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <PlusCircle className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                                {isSender ? "Sent" : "Received"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isSender ? 
                                <div>
                                  <div className="text-xs text-gray-500">To:</div>
                                  <div className="font-medium">{receiverEmail || "Unknown"}</div>
                                </div>
                                : 
                                <div>
                                  <div className="text-xs text-gray-500">From:</div>
                                  <div className="font-medium">{senderEmail || "Unknown"}</div>
                                </div>
                              }
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {transaction.status}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {transaction.note || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate("/send-money")}
                  >
                    Send Money
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ThemeProvider>
  );
}

import { useState } from "react";
import { Transaction, User } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ArrowUpRight, ArrowDownLeft } from "lucide-react";

type TransactionTableProps = {
  transactions: Transaction[] | undefined;
  users: User[] | undefined;
  isLoading: boolean;
};

type FilterType = "all" | "high-value" | "recent" | "suspicious";

export function TransactionTable({ transactions, users, isLoading }: TransactionTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  
  // Get user details by ID
  const getUserById = (userId: number | null) => {
    if (!userId || !users) return null;
    return users.find(user => user.id === userId);
  };
  
  // Apply filters
  const filteredTransactions = transactions?.filter(transaction => {
    // Apply search filter
    const searchFilter = searchQuery.toLowerCase();
    const senderUser = getUserById(transaction.senderId);
    const receiverUser = getUserById(transaction.receiverId || 0);
    
    const matchesSearch = 
      transaction.id.toString().includes(searchFilter) ||
      transaction.amount.toString().includes(searchFilter) ||
      senderUser?.name.toLowerCase().includes(searchFilter) ||
      senderUser?.email.toLowerCase().includes(searchFilter) ||
      receiverUser?.name.toLowerCase().includes(searchFilter) ||
      receiverUser?.email.toLowerCase().includes(searchFilter) ||
      (transaction.note && transaction.note.toLowerCase().includes(searchFilter));
    
    if (!matchesSearch) return false;
    
    // Apply type filter
    switch (filterType) {
      case "high-value":
        return transaction.amount > 5000; // Transactions over 5000
      case "recent":
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(transaction.createdAt) > oneWeekAgo;
      case "suspicious":
        // For demo purposes, mark transactions with amount > 8000 as suspicious
        return transaction.amount > 8000;
      default:
        return true;
    }
  });
  
  // Get total amount for filtered transactions
  const totalAmount = filteredTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
  
  return (
    <>
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
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
          value={filterType}
          onValueChange={(value) => setFilterType(value as FilterType)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            <SelectItem value="high-value">High Value</SelectItem>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="suspicious">Suspicious</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</p>
            <p className="text-xl font-semibold">{filteredTransactions?.length || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
            <p className="text-xl font-semibold">{formatCurrency(totalAmount)}</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-8 w-full mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </div>
        ) : filteredTransactions && filteredTransactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => {
                const sender = getUserById(transaction.senderId);
                const receiver = getUserById(transaction.receiverId || 0);
                const isSuspicious = transaction.amount > 8000;
                
                return (
                  <TableRow key={transaction.id} className={isSuspicious ? "bg-red-50 dark:bg-red-900/10" : ""}>
                    <TableCell className="font-medium">#{transaction.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <ArrowUpRight className="h-4 w-4 text-red-500 mr-1.5" />
                        <div>
                          <p>{sender?.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500">{sender?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <ArrowDownLeft className="h-4 w-4 text-green-500 mr-1.5" />
                        <div>
                          <p>{receiver?.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500">{receiver?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-1 max-w-[150px]">
                        {transaction.note || "-"}
                      </span>
                    </TableCell>
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
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
          </div>
        )}
      </div>
    </>
  );
}

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAdmin } from "@/hooks/use-admin";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Edit, XCircle, CheckCircle } from "lucide-react";

type UserTableProps = {
  users: User[] | undefined;
  isLoading: boolean;
};

export function UserTable({ users, isLoading }: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newBalance, setNewBalance] = useState("");
  const { blockUser, unblockUser } = useAdmin();
  const { toast } = useToast();
  
  // Filter users based on search
  const filteredUsers = users?.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });
  
  const handleBlockUser = async (userId: number) => {
    try {
      await blockUser(userId);
      toast({
        title: "User Blocked",
        description: "User has been successfully blocked.",
      });
    } catch (error) {
      toast({
        title: "Failed to Block",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  const handleUnblockUser = async (userId: number) => {
    try {
      await unblockUser(userId);
      toast({
        title: "User Unblocked",
        description: "User has been successfully unblocked.",
      });
    } catch (error) {
      toast({
        title: "Failed to Unblock",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateBalance = async () => {
    if (!selectedUser) return;
    
    const balanceNum = parseFloat(newBalance);
    
    if (isNaN(balanceNum) || balanceNum < 0) {
      toast({
        title: "Invalid Balance",
        description: "Balance must be a positive number.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest("PATCH", `/api/admin/users/${selectedUser.id}/balance`, { balance: balanceNum });
      
      toast({
        title: "Balance Updated",
        description: "User's balance has been successfully updated.",
      });
      
      // Refetch users
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "Failed to Update Balance",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setNewBalance(user.balance.toString());
    setIsEditDialogOpen(true);
  };
  
  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-8 w-full mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </div>
        ) : filteredUsers && filteredUsers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{formatCurrency(user.balance)}</TableCell>
                  <TableCell>
                    {user.isVerified ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        Unverified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isBlocked ? (
                      <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Blocked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        <span className="sr-only md:not-sr-only md:inline-block">Edit</span>
                      </Button>
                      
                      {user.isBlocked ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUnblockUser(user.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="sr-only md:not-sr-only md:inline-block">Unblock</span>
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleBlockUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          <span className="sr-only md:not-sr-only md:inline-block">Block</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        )}
      </div>
      
      {/* Edit Balance Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Balance</DialogTitle>
            <DialogDescription>
              Change the balance for {selectedUser?.name} ({selectedUser?.email}).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="balance" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                New Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                <Input
                  id="balance"
                  type="number"
                  className="pl-8"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleUpdateBalance}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

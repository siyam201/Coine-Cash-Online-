import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { UserTable } from "@/components/admin/UserTable";
import { User } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminUsers() {
  // Fetch users data
  const { 
    data: users, 
    isLoading: isLoadingUsers 
  } = useQuery<User[]>({ 
    queryKey: ["/api/admin/users"] 
  });
  
  // Calculate user statistics
  const totalUsers = users?.length || 0;
  const verifiedUsers = users?.filter(user => user.isVerified).length || 0;
  const blockedUsers = users?.filter(user => user.isBlocked).length || 0;
  const activeUsers = totalUsers - blockedUsers;
  
  return (
    <AdminLayout title="User Management">
      {/* User Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-3xl font-semibold">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Verified Users</p>
              <p className="text-3xl font-semibold">{verifiedUsers}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
              <p className="text-3xl font-semibold">{activeUsers}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Blocked Users</p>
              <p className="text-3xl font-semibold">{blockedUsers}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* User Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View, edit, or block users</CardDescription>
        </CardHeader>
        <CardContent>
          <UserTable users={users} isLoading={isLoadingUsers} />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

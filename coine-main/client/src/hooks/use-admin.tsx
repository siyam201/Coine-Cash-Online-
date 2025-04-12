import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useAdmin() {
  const { toast } = useToast();

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/block`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "ব্লক করতে ব্যর্থ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/unblock`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "আনব্লক করতে ব্যর্থ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change user balance mutation
  const updateUserBalanceMutation = useMutation({
    mutationFn: async ({ userId, balance }: { userId: number; balance: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/balance`, { balance });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "ব্যালেন্স আপডেট হয়েছে",
        description: "ইউজারের ব্যালেন্স সফলভাবে আপডেট করা হয়েছে।",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "ব্যালেন্স আপডেট করতে ব্যর্থ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Block a user
  const blockUser = async (userId: number) => {
    return blockUserMutation.mutateAsync(userId);
  };

  // Unblock a user
  const unblockUser = async (userId: number) => {
    return unblockUserMutation.mutateAsync(userId);
  };

  // Update user balance
  const updateUserBalance = async (userId: number, balance: number) => {
    return updateUserBalanceMutation.mutateAsync({ userId, balance });
  };

  return {
    blockUser,
    unblockUser,
    updateUserBalance,
    isBlocking: blockUserMutation.isPending,
    isUnblocking: unblockUserMutation.isPending,
    isUpdatingBalance: updateUserBalanceMutation.isPending,
  };
}

import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Transaction } from "@shared/schema";
import { 
  Users, 
  BarChart3, 
  Banknote, 
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

type DashboardStatsProps = {
  users: User[] | undefined;
  transactions: Transaction[] | undefined;
  isLoading: boolean;
};

export function DashboardStats({ users, transactions, isLoading }: DashboardStatsProps) {
  // Calculate stats
  const totalUsers = users?.length || 0;
  const totalTransactions = transactions?.length || 0;
  
  const totalBalance = users?.reduce((sum, user) => sum + user.balance, 0) || 0;
  
  const suspiciousUsers = users?.filter(user => user.isBlocked).length || 0;
  
  // Create stat cards
  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "primary",
      link: "/admin/users"
    },
    {
      title: "Total Transactions",
      value: totalTransactions,
      icon: BarChart3,
      color: "green",
      link: "/admin/transactions"
    },
    {
      title: "Total Balance",
      value: formatCurrency(totalBalance),
      icon: Banknote,
      color: "yellow",
      link: "/admin/users"
    },
    {
      title: "Suspicious Accounts",
      value: suspiciousUsers,
      icon: ShieldAlert,
      color: "red",
      link: "/admin/users"
    }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-36 mb-2" />
                <Skeleton className="h-8 w-24 mb-4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        : stats.map((stat, index) => {
            const Icon = stat.icon;
            
            return (
              <Card key={index}>
                <CardContent className="p-5">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 bg-${stat.color}-100 dark:bg-${stat.color}-900 rounded-md p-3`}>
                      <Icon className={`text-${stat.color}-600 dark:text-${stat.color}-400 h-5 w-5`} />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{stat.title}</dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900 dark:text-white">{stat.value}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4 text-sm">
                    <Link href={stat.link} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 flex items-center">
                      View Details
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
    </div>
  );
}

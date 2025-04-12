import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  DatabaseBackup, 
  RefreshCcw, 
  Users, 
  Receipt, 
  Settings, 
  File 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type DatabaseStats = {
  user_count: number;
  transaction_count: number;
  otp_count: number;
  user_settings_count: number;
  user_documents_count: number;
  index_count: number;
};

export function MaintenanceTools() {
  const { toast } = useToast();
  const [lastMaintenanceTime, setLastMaintenanceTime] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);

  // Mutation for running database vacuum
  const maintenanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/maintenance/vacuum");
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "ডাটাবেস মেইনটেন্যান্স সম্পন্ন হয়েছে",
        description: "ডাটাবেস অপটিমাইজেশন এবং পরিষ্কার সফলভাবে সম্পন্ন হয়েছে।",
        variant: "default",
      });
      setLastMaintenanceTime(new Date().toLocaleString('bn-BD'));
      if (data.stats) {
        setDbStats(data.stats);
      }
    },
    onError: (error) => {
      toast({
        title: "ডাটাবেস মেইনটেন্যান্স ব্যর্থ হয়েছে",
        description: error.message || "একটি অজ্ঞাত ত্রুটি ঘটেছে।",
        variant: "destructive",
      });
    },
  });

  const handleRunMaintenance = () => {
    maintenanceMutation.mutate();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>ডাটাবেস মেইনটেন্যান্স টুলস</CardTitle>
          <CardDescription>
            সিস্টেম পারফরম্যান্স এবং ডাটা অপটিমাইজেশন ম্যানেজ করুন
          </CardDescription>
        </div>
        <Button
          onClick={handleRunMaintenance}
          disabled={maintenanceMutation.isPending}
          variant="default"
          className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
        >
          {maintenanceMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              অপটিমাইজেশন চলছে...
            </>
          ) : (
            <>
              <DatabaseBackup className="mr-2 h-4 w-4" />
              মেইনটেন্যান্স চালান
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>টুল</TableHead>
              <TableHead>বিবরণ</TableHead>
              <TableHead>শেষ চালানো হয়েছিল</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">ডাটাবেস ভ্যাকুয়াম</TableCell>
              <TableCell>
                ডাটাবেস অপটিমাইজেশন, অব্যবহৃত স্পেস পুনরুদ্ধার এবং স্টোরেজ ব্যবহার উন্নত করে
              </TableCell>
              <TableCell>
                {lastMaintenanceTime || "এখনও চালানো হয়নি"}
              </TableCell>
              <TableCell>
                {maintenanceMutation.isPending ? (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    চলছে...
                  </Badge>
                ) : lastMaintenanceTime ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    সম্পন্ন
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                    চালানো হয়নি
                  </Badge>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">ইনডেক্স অপটিমাইজেশন</TableCell>
              <TableCell>
                ডাটাবেস টেবিলে ইনডেক্স তৈরি করে দ্রুত অনুসন্ধান ও উন্নত পারফরম্যান্স
              </TableCell>
              <TableCell>
                {lastMaintenanceTime || "এখনও চালানো হয়নি"}
              </TableCell>
              <TableCell>
                {dbStats ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {dbStats.index_count} ইনডেক্স মেইনটেইন করা হয়েছে
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                    চালানো হয়নি
                  </Badge>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">মেমরি অপটিমাইজেশন</TableCell>
              <TableCell>
                পুরানো ও অপ্রয়োজনীয় ডাটা পরিষ্কার করে এবং মেমরি মুক্ত করে
              </TableCell>
              <TableCell>
                {lastMaintenanceTime || "এখনও চালানো হয়নি"}
              </TableCell>
              <TableCell>
                {dbStats ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    সফল
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                    চালানো হয়নি
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {dbStats && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">ইউজার</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{dbStats.user_count}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">লেনদেন</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{dbStats.transaction_count}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">সেটিংস</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{dbStats.user_settings_count}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">ডকুমেন্টস</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{dbStats.user_documents_count}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground border-t pt-4">
        <div className="flex items-center w-full justify-between">
          <div className="flex items-center">
            <RefreshCcw className="mr-2 h-4 w-4" />
            সিস্টেম প্রতি ২৪ ঘন্টায় স্বয়ংক্রিয়ভাবে মেইনটেন্যান্স চালায়
          </div>
          {lastMaintenanceTime && (
            <div className="text-xs text-muted-foreground">
              সর্বশেষ মেইনটেন্যান্স: {lastMaintenanceTime}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
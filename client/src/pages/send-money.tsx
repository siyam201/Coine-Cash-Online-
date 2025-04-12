import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SendMoney, sendMoneySchema } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronLeft,
  Send,
  Info,
  Search,
  X
} from "lucide-react";

export default function SendMoneyPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  
  // For searching users by email
  const { data: userSuggestions, isLoading } = useQuery({
    queryKey: ["/api/users/search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 3) return [];
      const res = await apiRequest("GET", `/api/users/search?email=${encodeURIComponent(searchTerm)}`);
      return await res.json();
    },
    enabled: searchTerm.length >= 3,
  });

  const form = useForm<SendMoney>({
    resolver: zodResolver(sendMoneySchema),
    defaultValues: {
      receiverEmail: "",
      amount: undefined, // 0 এর পরিবর্তে undefined ব্যবহার করবো, কারণ ইনপুট ফিল্ড যখন খালি থাকবে তখন এটি প্রাথমিকভাবে খালি দেখাবে
      note: "",
      password: "",
    },
  });
  
  // Handle outside clicks to close suggestion box
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sendMoneyMutation = useMutation({
    mutationFn: async (data: SendMoney) => {
      // নতুন API এন্ডপয়েন্ট ব্যবহার করছি যা ইউজারের টোকেন দিয়ে ট্রানজেকশন করে
      const res = await apiRequest("POST", "/api/user/transfer", data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      toast({
        title: "Transaction Successful",
        description: `Your money has been sent successfully! Your current balance is ${formatCurrency(data.currentBalance)}`,
      });
      
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Transaction Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsConfirming(false);
    },
  });

  const onSubmit = (data: SendMoney) => {
    setIsConfirming(true);
  };

  const handleConfirmSend = () => {
    sendMoneyMutation.mutate(form.getValues());
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 transition-colors duration-200">
        <div className="max-w-md mx-auto pt-10 pb-20 px-4">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center text-gray-600 dark:text-gray-400 mb-6 hover:text-primary-500 dark:hover:text-primary-400"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>

          <Card className="border-t-4 border-t-primary shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Send Money
              </CardTitle>
              <CardDescription>
                Send money securely and quickly to anyone using their email address
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-primary-50 dark:from-gray-800 dark:to-gray-700 rounded-md border border-primary/20 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Balance</span>
                    <span className="text-xl font-bold text-primary dark:text-primary-400">
                      {formatCurrency(user.balance)}
                    </span>
                  </div>
                </div>
              )}

              {isConfirming ? (
                <div className="space-y-6">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Confirm Transaction</AlertTitle>
                    <AlertDescription>
                      You are about to send {formatCurrency(form.getValues().amount)} to {form.getValues().receiverEmail}.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 transition-all"
                      onClick={() => setIsConfirming(false)}
                    >
                      <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button 
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white transition-all shadow-md"
                      onClick={handleConfirmSend}
                      disabled={sendMoneyMutation.isPending}
                    >
                      {sendMoneyMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" /> Confirm
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="receiverEmail"
                      render={({ field }) => (
                        <FormItem className="relative">
                          <FormLabel>Receiver's Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="example@email.com" 
                                type="email"
                                {...field} 
                                value={searchTerm || field.value}
                                onChange={(e) => {
                                  setSearchTerm(e.target.value);
                                  field.onChange(e.target.value);
                                  setShowSuggestions(true);
                                }}
                                className="pr-8"
                              />
                              {searchTerm && (
                                <button
                                  type="button"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                  onClick={() => {
                                    setSearchTerm("");
                                    field.onChange("");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                          
                          {/* Email Suggestions */}
                          {showSuggestions && searchTerm.length >= 3 && (
                            <div 
                              ref={suggestionRef}
                              className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700"
                            >
                              {isLoading ? (
                                <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                                  Searching...
                                </div>
                              ) : userSuggestions && userSuggestions.length > 0 ? (
                                <ul className="max-h-60 overflow-auto py-1">
                                  {userSuggestions.map((user: any) => (
                                    <li 
                                      key={user.id}
                                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                                      onClick={() => {
                                        setSearchTerm(user.email);
                                        field.onChange(user.email);
                                        setShowSuggestions(false);
                                      }}
                                    >
                                      <div className="font-medium">{user.email}</div>
                                      {user.name && <div className="text-xs text-gray-500 dark:text-gray-400">({user.name})</div>}
                                    </li>
                                  ))}
                                </ul>
                              ) : searchTerm.length >= 3 ? (
                                <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                                  No matching users found
                                </div>
                              ) : null}
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                className="pl-8" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction Note (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter details about this transaction..." 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-start">
                      <Checkbox id="confirm-transaction" required />
                      <label 
                        htmlFor="confirm-transaction" 
                        className="ml-3 text-sm text-gray-700 dark:text-gray-300"
                      >
                        I confirm that the above information is correct
                      </label>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white transition-all duration-300 shadow-md"
                    >
                      <Send className="mr-2 h-4 w-4" /> Next Step
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ThemeProvider>
  );
}

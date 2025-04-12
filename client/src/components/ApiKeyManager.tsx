import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, FormControl, FormDescription, FormField, FormItem, 
  FormLabel, FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createApiKeySchema } from "@shared/schema";
import { Loader2, Copy, Eye, EyeOff, AlertTriangle, Shield, Clock, Check, Settings, X, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// API কী ফর্মের টাইপ
type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>;

// API কী মেনেজার কম্পোনেন্ট
export function ApiKeyManager() {
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // API কী লোড করা
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/user/api-keys']
  });
  
  // মিউটেশন ফাংশন - নতুন API কী তৈরি করার জন্য
  const createMutation = useMutation({
    mutationFn: async (data: CreateApiKeyFormValues) => {
      const response = await apiRequest('/api/user/api-keys', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/api-keys'] });
      setNewApiKey(data.apiKey.key);
      toast({
        title: "API কী তৈরি করা হয়েছে",
        description: "আপনার API কী সফলভাবে তৈরি করা হয়েছে।",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "ত্রুটি!",
        description: error.message || "API কী তৈরি করতে ব্যর্থ হয়েছে",
        variant: "destructive",
      });
    }
  });
  
  // মিউটেশন ফাংশন - API কী ডিলিট করার জন্য
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/user/api-keys/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/api-keys'] });
      toast({
        title: "API কী মুছে ফেলা হয়েছে",
        description: "আপনার API কী সফলভাবে মুছে ফেলা হয়েছে।",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "ত্রুটি!",
        description: error.message || "API কী মুছতে ব্যর্থ হয়েছে",
        variant: "destructive",
      });
    }
  });
  
  // API কী অ্যাক্টিভেট/ডিঅ্যাক্টিভেট করার ফাংশন
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number, active: boolean }) => {
      const response = await apiRequest(`/api/user/api-keys/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/api-keys'] });
      toast({
        title: "API কী আপডেট করা হয়েছে",
        description: "আপনার API কী স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে।",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "ত্রুটি!",
        description: error.message || "API কী আপডেট করতে ব্যর্থ হয়েছে",
        variant: "destructive",
      });
    }
  });
  
  // ফর্ম তৈরি করা
  const form = useForm<CreateApiKeyFormValues>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: "",
      permissions: ["transfer"],
      description: "",
      expirationDays: 365,
      ipRestrictions: []
    }
  });
  
  // ফর্ম সাবমিট ফাংশন
  const onSubmit = (values: CreateApiKeyFormValues) => {
    createMutation.mutate(values);
  };
  
  // নতুন API কী বানাবার পরে ফর্ম রিসেট করা
  const resetForm = () => {
    form.reset();
    setNewApiKey(null);
    setShowNewKeyDialog(false);
  };
  
  // API কী কপি করার ফাংশন
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "কপি করা হয়েছে!",
      description: "API কী ক্লিপবোর্ডে কপি করা হয়েছে।",
      variant: "default",
    });
  };
  
  // API কী ফরম্যাট করার ফাংশন - মেয়াদ দেখাবার জন্য
  const formatDate = (date: string) => {
    const d = new Date(date);
    return new Intl.DateTimeFormat('bn-BD', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>API কী ম্যানেজার</CardTitle>
          <CardDescription>লোড হচ্ছে...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>API কী ম্যানেজার</CardTitle>
          <CardDescription>ত্রুটি দেখা দিয়েছে</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>API কী লোড করতে ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>API কী ম্যানেজার</CardTitle>
          <CardDescription>এই API কী ব্যবহার করে আপনার সিস্টেম Coine Cash API-এর সাথে সংযোগ করুন</CardDescription>
        </div>
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              নতুন API কী
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            {newApiKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>API কী তৈরি করা হয়েছে!</DialogTitle>
                  <DialogDescription>
                    এই API কী শুধুমাত্র একবারই দেখানো হবে। অনুগ্রহ করে এটি একটি নিরাপদ জায়গায় সংরক্ষণ করুন। 
                  </DialogDescription>
                </DialogHeader>
                <div className="my-6">
                  <div className="relative">
                    <Input
                      readOnly
                      value={newApiKey}
                      className="pr-12 font-mono text-sm bg-secondary"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={() => copyToClipboard(newApiKey)}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copy</span>
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    এই API কী আবার দেখাতে অসম্ভব। হারিয়ে গেলে, আপনাকে একটি নতুন কী তৈরি করতে হবে।
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={resetForm}>বন্ধ করুন</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>নতুন API কী তৈরি করুন</DialogTitle>
                  <DialogDescription>
                    বাইরের অ্যাপ্লিকেশন থেকে আপনার অ্যাকাউন্টে অ্যাক্সেস প্রদানের জন্য API কী তৈরি করুন।
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API কী নাম</FormLabel>
                          <FormControl>
                            <Input placeholder="মার্কেটপ্লেস ইন্টিগ্রেশন" {...field} />
                          </FormControl>
                          <FormDescription>
                            আপনার API কী-এর একটি বর্ণনামূলক নাম দিন
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>বিবরণ (ঐচ্ছিক)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="এই API কী কোন ওয়েবসাইটের জন্য ব্যবহৃত হবে?" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="permissions"
                      render={() => (
                        <FormItem>
                          <FormLabel>অনুমতি</FormLabel>
                          <div className="space-y-2">
                            <FormField
                              control={form.control}
                              name="permissions"
                              render={({ field }) => {
                                return (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes("transfer")}
                                        onCheckedChange={(checked) => {
                                          const value = field.value || [];
                                          return checked
                                            ? field.onChange([...value, "transfer"])
                                            : field.onChange(
                                                value.filter((val) => val !== "transfer")
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>
                                        অর্থ স্থানান্তর অনুমতি
                                      </FormLabel>
                                      <FormDescription>
                                        API কী ব্যবহার করে অর্থ স্থানান্তর করতে সক্ষম হবেন
                                      </FormDescription>
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="expirationDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>মেয়াদ (দিন)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value || ""} 
                              onChange={(e) => 
                                field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            API কী-এর মেয়াদ (দিন হিসাবে), খালি রাখলে অসীম মেয়াদ
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowNewKeyDialog(false)}>
                        বাতিল
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        তৈরি করুন
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {data?.apiKeys?.length > 0 ? (
          <div className="space-y-4">
            {data.apiKeys.map((key: any) => (
              <div key={key.id} className="border rounded-lg">
                <div className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {key.name}
                      {!key.active && <Badge variant="outline" className="text-red-500 border-red-300">নিষ্ক্রিয়</Badge>}
                      {key.active && key.expiresAt && new Date(key.expiresAt) < new Date() && (
                        <Badge variant="outline" className="text-amber-500 border-amber-300">মেয়াদ শেষ</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center mt-1">
                      <div className="font-mono bg-secondary px-2 py-1 rounded text-xs mr-2">
                        {key.keyPrefix}
                      </div>
                      {key.lastUsed ? (
                        <span className="text-xs">সর্বশেষ ব্যবহার: {formatDate(key.lastUsed)}</span>
                      ) : (
                        <span className="text-xs">কখনও ব্যবহার করা হয়নি</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedKey(expandedKey === key.id ? null : key.id)}
                    >
                      {expandedKey === key.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ id: key.id, active: !key.active })}
                    >
                      {key.active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("আপনি কি নিশ্চিত যে আপনি এই API কী মুছতে চান? এই ক্রিয়া অপরিবর্তনীয়।")) {
                          deleteMutation.mutate(key.id);
                        }
                      }}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {expandedKey === key.id && (
                  <div className="px-4 pb-4 pt-2 border-t">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {key.description && (
                        <>
                          <dt className="font-medium">বিবরণ</dt>
                          <dd>{key.description}</dd>
                        </>
                      )}
                      <dt className="font-medium">অনুমতি</dt>
                      <dd>
                        <div className="flex flex-wrap gap-1">
                          {key.permissions.map((permission: string) => (
                            <Badge key={permission} className="mr-1">
                              <Shield className="h-3 w-3 mr-1" />
                              {permission === "transfer" ? "অর্থ স্থানান্তর" : permission}
                            </Badge>
                          ))}
                        </div>
                      </dd>
                      <dt className="font-medium">তৈরি করা হয়েছে</dt>
                      <dd>{formatDate(key.createdAt)}</dd>
                      {key.expiresAt && (
                        <>
                          <dt className="font-medium">মেয়াদ শেষ</dt>
                          <dd className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(key.expiresAt)}
                          </dd>
                        </>
                      )}
                      {key.ipRestrictions && key.ipRestrictions.length > 0 && (
                        <>
                          <dt className="font-medium">IP সীমাবদ্ধতা</dt>
                          <dd>
                            {key.ipRestrictions.map((ip: string) => (
                              <Badge key={ip} variant="outline" className="mr-1">
                                {ip}
                              </Badge>
                            ))}
                          </dd>
                        </>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <div className="mb-2">আপনার কোন API কী নেই</div>
            <Button 
              variant="outline" 
              onClick={() => setShowNewKeyDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              প্রথম API কী তৈরি করুন
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 flex flex-col items-start">
        <h4 className="font-medium mb-2">API কী ব্যবহারের নির্দেশিকা</h4>
        <p className="text-sm text-muted-foreground mb-2">
          API কী ব্যবহার করে অর্থ স্থানান্তর করতে, নিচের নিয়ম অনুসরণ করুন:
        </p>
        <pre className="text-xs bg-secondary p-3 rounded-md w-full overflow-x-auto">
{`// অর্থ স্থানান্তর করার উদাহরণ
fetch('${window.location.origin}/api/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY_HERE'
  },
  body: JSON.stringify({
    receiverEmail: 'receiver@example.com',
    amount: 1000,
    note: 'পণ্য কেনাকাটা',
    sendNotification: true
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`}
        </pre>
      </CardFooter>
    </Card>
  );
}
import { useState } from "react";
import { useParams, Link } from "wouter";
import { useListThreads, useListCategories, useCreateThread, getListThreadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ArrowLeft, Clock, MessageSquare, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const createThreadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title is too long"),
  content: z.string().min(1, "Content is required"),
});

export default function Category() {
  const { id } = useParams();
  const categoryId = Number(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: catData } = useListCategories();
  const category = catData?.categories?.find(c => c.id === categoryId);

  const { data: threadsData, isLoading } = useListThreads(categoryId, { page: 1, limit: 50 });
  const createThreadMutation = useCreateThread({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListThreadsQueryKey(categoryId, { page: 1, limit: 50 }) });
        setIsDialogOpen(false);
        form.reset();
        toast({ title: "Thread initiated successfully." });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.message || "Failed to create thread." });
      }
    }
  });

  const form = useForm<z.infer<typeof createThreadSchema>>({
    resolver: zodResolver(createThreadSchema),
    defaultValues: { title: "", content: "" },
  });

  function onSubmit(values: z.infer<typeof createThreadSchema>) {
    createThreadMutation.mutate({ categoryId, data: values });
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-2">
            <Link href="/" className="inline-flex items-center text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Nodes
            </Link>
            <h1 className="text-3xl font-bold tracking-tighter flex items-center gap-3">
              <Terminal className="w-6 h-6 text-primary" />
              {category?.name || `Node [${categoryId}]`}
            </h1>
            {category?.description && (
              <p className="text-muted-foreground font-mono text-sm max-w-2xl">
                {category.description}
              </p>
            )}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-[0_0_15px_rgba(0,255,102,0.15)]" 
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    toast({ variant: "destructive", title: "Access Denied", description: "You must initialize a session to create a thread." });
                  }
                }}>
                <Plus className="w-4 h-4 mr-2" />
                Initiate Thread
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="font-mono text-xl flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  New Data Transmission
                </DialogTitle>
                <DialogDescription>
                  Commence a new thread in this node. Content will be encrypted.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-muted-foreground">Subject Header</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter subject..." className="bg-background/50 border-white/10 focus-visible:ring-primary font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-muted-foreground">Payload Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Type your message here..." 
                            className="bg-background/50 border-white/10 focus-visible:ring-primary min-h-[150px] font-sans" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={createThreadMutation.isPending} className="font-mono w-full sm:w-auto">
                      {createThreadMutation.isPending ? "Transmitting..." : "Broadcast Payload"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Thread List */}
        <div className="space-y-3">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-md bg-white/5" />
            ))
          ) : !threadsData?.threads?.length ? (
            <div className="p-12 text-center border border-white/5 rounded-lg bg-white/5 flex flex-col items-center mt-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-muted-foreground">No transmissions detected</h3>
              <p className="text-sm text-muted-foreground/60 mt-2 font-mono">Be the first to initiate contact in this node.</p>
            </div>
          ) : (
            threadsData.threads.map(thread => (
              <Link key={thread.id} href={`/threads/${thread.id}`} className="block group hover-elevate">
                <Card className="bg-card/30 border-white/5 hover:border-primary/30 transition-colors p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">
                      {thread.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
                      <span className="flex items-center text-primary/80 bg-primary/10 px-2 py-0.5 rounded">
                        @{thread.authorUsername}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Initiated {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 md:border-l md:border-white/10 md:pl-6 shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-mono text-muted-foreground flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-primary/50" />
                        {thread.postCount}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground/50 mt-1">
                        Replies
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

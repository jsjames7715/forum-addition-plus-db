import { useParams, Link } from "wouter";
import { useGetThread, useListPosts, useCreatePost, getListPostsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow, format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Clock, MessageSquare, CornerDownRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const createPostSchema = z.object({
  content: z.string().min(1, "Cannot send an empty payload"),
});

export default function Thread() {
  const { id } = useParams();
  const threadId = Number(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: thread, isLoading: threadLoading } = useGetThread(threadId);
  const { data: postsData, isLoading: postsLoading } = useListPosts(threadId, { page: 1, limit: 100 });
  
  const createPostMutation = useCreatePost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey(threadId, { page: 1, limit: 100 }) });
        form.reset();
        toast({ title: "Payload transmitted." });
        // Scroll to bottom after slight delay
        setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Transmission Failed", description: err.message || "Failed to submit post." });
      }
    }
  });

  const form = useForm<z.infer<typeof createPostSchema>>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { content: "" },
  });

  function onSubmit(values: z.infer<typeof createPostSchema>) {
    createPostMutation.mutate({ threadId, data: values });
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="space-y-4 border-b border-white/10 pb-6">
          <Link href={thread ? `/categories/${thread.categoryId}` : "/"} className="inline-flex items-center text-sm font-mono text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Node
          </Link>
          
          {threadLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-3/4 bg-white/5" />
              <Skeleton className="h-4 w-1/4 bg-white/5" />
            </div>
          ) : thread ? (
            <div className="space-y-3">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                {thread.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5 text-primary/90 bg-primary/10 px-2 py-1 rounded">
                  <User className="w-3.5 h-3.5" />
                  {thread.authorUsername}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(thread.createdAt), "yyyy-MM-dd HH:mm:ss 'UTC'")}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {thread.postCount} Messages
                </span>
              </div>
            </div>
          ) : (
            <div className="text-destructive font-mono">Transmission Header Corrupted (404)</div>
          )}
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {postsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-md bg-white/5" />
            ))
          ) : postsData?.posts?.map((post, idx) => (
            <div key={post.id} className="group flex gap-4">
              {/* Avatar Column */}
              <div className="hidden sm:flex flex-col items-center shrink-0 w-12 pt-1">
                <div className="w-10 h-10 rounded overflow-hidden border border-white/10 bg-background/50 relative">
                  <img 
                    src={`${import.meta.env.BASE_URL}images/avatar-placeholder.png`} 
                    alt="avatar"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-primary/10 mix-blend-color-burn"></div>
                </div>
                {/* Connecting line to next post */}
                {idx !== postsData.posts.length - 1 && (
                  <div className="w-px h-full bg-white/5 mt-2"></div>
                )}
              </div>
              
              {/* Content Column */}
              <div className="flex-1 bg-card/20 border border-white/5 rounded-lg p-5 group-hover:border-white/10 transition-colors">
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2 sm:hidden mb-2">
                    <User className="w-4 h-4 text-primary/70" />
                    <span className="font-mono text-sm text-primary/90">{post.authorUsername}</span>
                  </div>
                  <span className="hidden sm:inline font-mono text-sm text-primary/90 font-medium">
                    {post.authorUsername}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground" title={format(new Date(post.createdAt), "PPpp")}>
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="prose prose-invert prose-p:text-gray-300 max-w-none text-[15px] leading-relaxed font-sans whitespace-pre-wrap">
                  {post.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Form */}
        <div className="mt-10 pt-6 border-t border-white/10">
          {!user ? (
            <div className="bg-card/40 border border-white/5 p-6 rounded-lg text-center flex flex-col items-center">
              <CornerDownRight className="w-8 h-8 text-muted-foreground/40 mb-3" />
              <p className="font-mono text-sm text-muted-foreground mb-4">You must initialize a session to append data to this transmission.</p>
              <div className="flex gap-4">
                <Link href="/login">
                  <Button variant="outline" className="font-mono border-white/10">Initialize</Button>
                </Link>
                <Link href="/register">
                  <Button className="font-mono bg-primary text-primary-foreground">Register</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-card/20 border border-primary/20 rounded-lg p-1">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="Type your transmission..." 
                            className="bg-transparent border-0 focus-visible:ring-0 min-h-[120px] font-sans resize-y px-4 py-4 rounded-t-lg" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="px-4 pb-2" />
                      </FormItem>
                    )}
                  />
                  <div className="bg-background/40 border-t border-white/5 p-3 flex justify-between items-center rounded-b-md">
                    <span className="font-mono text-xs text-muted-foreground ml-2 hidden sm:inline">
                      Signed as: <span className="text-primary">{user.username}</span>
                    </span>
                    <Button 
                      type="submit" 
                      disabled={createPostMutation.isPending} 
                      className="font-mono ml-auto"
                      size="sm"
                    >
                      <CornerDownRight className="w-4 h-4 mr-2" />
                      {createPostMutation.isPending ? "Transmitting..." : "Append Data"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

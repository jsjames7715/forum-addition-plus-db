import { useParams, Link } from "wouter";
import { useGetUserProfile } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Terminal, Calendar, MessageSquare, Activity, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const { data: profile, isLoading, isError } = useGetUserProfile(username || "");

  const isOwnProfile = currentUser?.username === username;

  if (isError) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12 text-center text-destructive font-mono border border-destructive/20 bg-destructive/5 rounded-lg p-8">
          Identity Profile Not Found or Corrupted.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 border-b border-white/10 pb-8 relative">
          {isLoading ? (
            <Skeleton className="w-24 h-24 rounded-lg bg-white/5" />
          ) : (
            <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-primary/30 bg-background flex items-center justify-center shrink-0">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-mono font-bold text-primary/50">
                  {profile?.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          )}
          
          <div className="flex-1 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="w-48 h-8 bg-white/5" />
                <Skeleton className="w-32 h-4 bg-white/5" />
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tighter text-foreground flex items-center gap-3">
                  {profile?.displayName || profile?.username}
                  {isOwnProfile && (
                    <Link href="/account">
                      <Button variant="outline" size="sm" className="h-8 border-white/10 font-mono text-xs ml-4">
                        <Edit className="w-3 h-3 mr-2" /> Configure
                      </Button>
                    </Link>
                  )}
                </h1>
                <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
                  <span className="text-primary">@{profile?.username}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Initialized {profile?.createdAt ? format(new Date(profile.createdAt), "yyyy-MM-dd") : ""}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="bg-card/30 border border-white/5 rounded-lg p-6">
          <h2 className="text-lg font-mono mb-4 text-primary/80 flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Identity Directive
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="w-full h-4 bg-white/5" />
              <Skeleton className="w-2/3 h-4 bg-white/5" />
            </div>
          ) : (
            <p className="font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {profile?.bio || "No directive specified."}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card/20 border border-white/5 p-6 rounded-lg flex items-center gap-4 group hover:border-primary/30 transition-colors">
            <div className="p-3 bg-primary/10 rounded text-primary">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{isLoading ? <Skeleton className="w-8 h-8 bg-white/5" /> : profile?.threadCount}</p>
              <p className="text-xs font-mono text-muted-foreground">Transmissions Initiated</p>
            </div>
          </div>
          <div className="bg-card/20 border border-white/5 p-6 rounded-lg flex items-center gap-4 group hover:border-primary/30 transition-colors">
            <div className="p-3 bg-primary/10 rounded text-primary">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{isLoading ? <Skeleton className="w-8 h-8 bg-white/5" /> : profile?.postCount}</p>
              <p className="text-xs font-mono text-muted-foreground">Data Appends</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

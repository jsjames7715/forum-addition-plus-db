import { useListCategories } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { MessageSquare, Server, Activity, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function Home() {
  const { data, isLoading, error } = useListCategories();

  return (
    <Layout>
      <div className="space-y-8">
        <div className="space-y-2 border-b border-white/10 pb-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter">Secure Nodes</h1>
          <p className="text-muted-foreground font-mono text-sm max-w-2xl">
            Select a designated channel to view encrypted discussions. All timestamps are localized to your device.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 border border-destructive/30 bg-destructive/5 rounded-lg text-destructive font-mono text-sm">
            [ERROR] Failed to fetch category nodes: {error.message}
          </div>
        ) : !data?.categories?.length ? (
          <div className="p-12 text-center border border-white/5 rounded-lg bg-white/5 flex flex-col items-center">
            <Server className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No Active Nodes</h3>
            <p className="text-muted-foreground text-sm mt-2">The network appears to be empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.categories.map((category, idx) => (
              <motion.div 
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/categories/${category.id}`} className="block h-full group hover-elevate">
                  <Card className="h-full bg-card/40 backdrop-blur-sm border-white/5 group-hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-center gap-2">
                          <Activity className="w-5 h-5 text-primary/70" />
                          {category.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-sm pt-2 line-clamp-2">
                        {category.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6 text-xs font-mono text-muted-foreground mt-2 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary/50" />
                          <span>{category.threadCount} Threads</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary/50" />
                          <span>{category.postCount} Messages</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

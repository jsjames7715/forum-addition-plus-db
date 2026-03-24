import { ReactNode } from "react";
import { Link } from "wouter";
import { Shield, Terminal, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export function Layout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout, isLoggingOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col relative text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-primary">
      {/* Background with glowing effect */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <img 
          src={`${import.meta.env.BASE_URL}images/bg-glow.png`} 
          alt="Ambient glow" 
          className="w-full h-full object-cover opacity-60 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background"></div>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-md bg-white/5 border border-white/10 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="font-mono font-bold tracking-tight text-lg">AnonForum</span>
          </Link>

          <nav className="flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="w-24 h-9 bg-white/5" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-sm font-mono text-muted-foreground border border-white/10 px-3 py-1.5 rounded-md bg-black/40">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span>{user.username}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="font-mono gap-2 border-white/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Disconnect</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm font-mono font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2">
                  Initialize
                </Link>
                <Link href="/register">
                  <Button size="sm" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,255,102,0.2)]">
                    <User className="w-4 h-4 mr-2" />
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-auto z-10 bg-background/80">
        <div className="container mx-auto px-4 max-w-6xl text-center flex flex-col items-center">
          <Shield className="w-6 h-6 text-muted-foreground/30 mb-4" />
          <p className="text-xs font-mono text-muted-foreground">
            End-to-end encrypted forum interface. Navigate with caution.
          </p>
        </div>
      </footer>
    </div>
  );
}

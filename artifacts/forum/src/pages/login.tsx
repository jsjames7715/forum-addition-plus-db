import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const { login, isLoggingIn } = useAuth();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    login(values);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background selection:bg-primary/30 selection:text-primary text-foreground">
      {/* Background with glowing effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img 
          src={`${import.meta.env.BASE_URL}images/bg-glow.png`} 
          alt="Ambient glow" 
          className="w-full h-full object-cover opacity-60 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]"></div>
      </div>

      <motion.div 
        className="w-full max-w-md px-4 z-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex justify-center mb-8">
          <Link href="/" className="inline-block hover:scale-105 transition-transform">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_30px_rgba(0,255,102,0.15)]">
              <Shield className="w-10 h-10 text-primary" />
            </div>
          </Link>
        </div>

        <Card className="bg-card/60 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-mono tracking-tight">Session Initialization</CardTitle>
            <CardDescription className="font-mono mt-2">Enter credentials to access secure nodes</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-muted-foreground text-xs uppercase tracking-widest">Identifier</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="username" 
                            className="pl-10 bg-background/50 border-white/10 font-mono h-11 focus-visible:ring-primary/50" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-muted-foreground text-xs uppercase tracking-widest">Passphrase</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="password"
                            placeholder="••••••••" 
                            className="pl-10 bg-background/50 border-white/10 font-mono h-11 focus-visible:ring-primary/50 tracking-widest" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="font-mono text-xs" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={isLoggingIn} 
                  className="w-full h-11 font-mono tracking-widest text-sm bg-primary text-primary-foreground hover:bg-primary/90 mt-4 shadow-[0_0_20px_rgba(0,255,102,0.2)]"
                >
                  {isLoggingIn ? "Authenticating..." : "Establish Connection"}
                </Button>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="flex justify-center border-t border-white/5 pt-6 pb-6 bg-black/20">
            <div className="text-sm font-mono text-muted-foreground">
              No registered identifier?{" "}
              <Link href="/register" className="text-primary hover:text-primary/80 hover:underline transition-colors">
                Register identity
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

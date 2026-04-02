import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetMe, 
  getGetMeQueryKey, 
  useLogin, 
  useRegister, 
  useLogout 
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch current user session
  const { 
    data: user, 
    isLoading,
    isError 
  } = useGetMe({
    query: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    }
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMeQueryKey(), data);
        toast({
          title: "Access granted",
          description: `Welcome back, ${data.username}.`,
        });
        setLocation("/");
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: error.message || "Invalid credentials provided.",
        });
      }
    }
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMeQueryKey(), data);
        toast({
          title: "Identity registered",
          description: `Secure channel established for ${data.username}.`,
        });
        setLocation("/");
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error.message || "Failed to register identity.",
        });
      }
    }
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(getGetMeQueryKey(), null);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({
          title: "Connection terminated",
          description: "You have securely disconnected.",
        });
        setLocation("/");
      }
    }
  });

  return {
    user: isError ? null : user,
    isLoading,
    login: (values: { username: string; password: string }) => loginMutation.mutateAsync({ data: values }),
    isLoggingIn: loginMutation.isPending,
    register: (values: { username: string; password: string }) => registerMutation.mutateAsync({ data: values }),
    isRegistering: registerMutation.isPending,
    logout: () => logoutMutation.mutateAsync(),
    isLoggingOut: logoutMutation.isPending,
  };
}

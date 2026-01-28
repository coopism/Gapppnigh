import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface Owner {
  id: string;
  email: string;
  name: string | null;
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput extends LoginInput {
  name?: string;
}

export function useAuth() {
  const [, setLocation] = useLocation();
  
  const { data: owner, isLoading, error } = useQuery<Owner>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const response = await apiRequest("POST", "/api/auth/login", input);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/owner/dashboard");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const response = await apiRequest("POST", "/api/auth/register", input);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/owner/dashboard");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/owner/login");
    },
  });

  return {
    owner,
    isLoading,
    isAuthenticated: !!owner && !error,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}

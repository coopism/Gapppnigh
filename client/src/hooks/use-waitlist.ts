import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertWaitlist } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useAddToWaitlist() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertWaitlist) => {
      const validated = api.waitlist.submit.input.parse(data);
      const res = await fetch(api.waitlist.submit.path, {
        method: api.waitlist.submit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.waitlist.submit.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to join waitlist");
      }
      return api.waitlist.submit.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

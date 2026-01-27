import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertHotelInquiry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useSubmitHotelInquiry() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertHotelInquiry) => {
      const validated = api.hotelInquiries.submit.input.parse(data);
      const res = await fetch(api.hotelInquiries.submit.path, {
        method: api.hotelInquiries.submit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.hotelInquiries.submit.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to submit inquiry");
      }
      return api.hotelInquiries.submit.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      toast({
        title: "Inquiry Sent!",
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

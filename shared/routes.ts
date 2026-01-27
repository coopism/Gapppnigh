import { z } from "zod";
import { insertDealSchema, insertWaitlistSchema, insertHotelInquirySchema, deals } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  deals: {
    list: {
      method: "GET" as const,
      path: "/api/deals",
      input: z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        sort: z.enum(["best", "cheapest", "discount", "rating"]).optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof deals.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/deals/:id",
      responses: {
        200: z.custom<typeof deals.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  waitlist: {
    submit: {
      method: "POST" as const,
      path: "/api/waitlist",
      input: insertWaitlistSchema,
      responses: {
        201: z.object({ success: z.boolean(), message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  hotelInquiries: {
    submit: {
      method: "POST" as const,
      path: "/api/hotel-inquiries",
      input: insertHotelInquirySchema,
      responses: {
        201: z.object({ success: z.boolean(), message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type DealResponse = z.infer<typeof api.deals.get.responses[200]>;
export type DealsListResponse = z.infer<typeof api.deals.list.responses[200]>;

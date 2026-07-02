import { z } from "zod";

const daysSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return 30;
    return value;
  },
  z.coerce.number().int().min(1).max(365)
);

export const dashboardOverviewQuerySchema = z.object({
  query: z.object({
    days: daysSchema.default(30),
  }),
});

export const businessInsightsQuerySchema = z.object({
  query: z.object({
    days: daysSchema.default(30),
  }),
});
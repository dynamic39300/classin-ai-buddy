import { z } from "zod";

export const truthLabelSchema = z.enum(["real", "simulated", "integration-simulated", "future"]);

export const scaffoldStatusSchema = z.object({
  service: z.string(),
  status: z.literal("ready"),
  truthLabel: truthLabelSchema,
  modules: z.array(z.string()),
});

export type ScaffoldStatus = z.infer<typeof scaffoldStatusSchema>;


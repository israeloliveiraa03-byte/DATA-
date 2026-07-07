import { z } from "zod";

export const researchTeamRoleValues = ["editor", "viewer"] as const;

export const inviteMemberSchema = z.object({
  email: z.string().email("E-mail inválido").max(255),
  role:  z.enum(researchTeamRoleValues),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(researchTeamRoleValues),
});

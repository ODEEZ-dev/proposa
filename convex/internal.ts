import { v } from "convex/values"
import { internalQuery } from "./_generated/server"

/** Internal: loads intake + client + services + user for the generateProposal action. */
export const getIntakeForAction = internalQuery({
  args: { intakeId: v.id("projectIntakes") },
  handler: async (ctx, { intakeId }) => {
    const intake = await ctx.db.get(intakeId)
    if (!intake) return null
    const client = await ctx.db.get(intake.clientId)
    const services = await ctx.db
      .query("services")
      .withIndex("by_userId", (q) => q.eq("userId", intake.userId))
      .collect()
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", intake.userId))
      .first()
    return { intake, client, services, user }
  },
})

/** Internal: loads proposal + client + user + intake for the aiAssistantChat action. */
export const getProposalForAction = internalQuery({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const proposal = await ctx.db.get(proposalId)
    if (!proposal) return null
    const client = await ctx.db.get(proposal.clientId)
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", proposal.userId))
      .first()
    const intake = await ctx.db.get(proposal.intakeId)
    return { proposal, client, user, intake }
  },
})
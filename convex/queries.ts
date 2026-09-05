import { v } from "convex/values"
import { query } from "./_generated/server"
import { DEMO_USER_ID } from "./constants"

/** Single-user demo mode — every request acts as the demo user. */
export const getUserId = async (): Promise<string | null> => DEMO_USER_ID
export const requireUserId = async (): Promise<string> => DEMO_USER_ID

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId()
    if (userId === null) return null
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()
    return user ?? null
  },
})

export const listClients = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId()
    return ctx.db
      .query("clients")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})

export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const userId = await requireUserId()
    const client = await ctx.db.get(clientId)
    if (!client || client.userId !== userId) return null
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect()
    return { client, proposals }
  },
})

export const listServices = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId()
    return ctx.db
      .query("services")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})

export const listProposals = query({
  args: {
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { status, search }) => {
    const userId = await requireUserId()
    let proposals = await ctx.db
      .query("proposals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()

    if (status && status !== "all") {
      proposals = proposals.filter((p) => p.status === status)
    }
    if (search) {
      const q = search.toLowerCase()
      proposals = proposals.filter(
        (p) =>
          p.title.toLowerCase().includes(q) || (p.aiSummary ?? "").toLowerCase().includes(q)
      )
    }

    const clientMap = new Map(
      await Promise.all(
        proposals.map(async (p) => {
          const c = await ctx.db.get(p.clientId)
          return [p.clientId, c] as const
        })
      )
    )
    const intakeMap = new Map(
      await Promise.all(
        proposals.map(async (p) => {
          const i = await ctx.db.get(p.intakeId)
          return [p.intakeId, i] as const
        })
      )
    )

    return proposals.map((p) => ({
      proposal: p,
      client: clientMap.get(p.clientId) ?? null,
      intake: intakeMap.get(p.intakeId) ?? null,
    }))
  },
})

export const getProposal = query({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const userId = await requireUserId()
    const proposal = await ctx.db.get(proposalId)
    if (!proposal || proposal.userId !== userId) return null
    const client = await ctx.db.get(proposal.clientId)
    const intake = await ctx.db.get(proposal.intakeId)
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()
    return { proposal, client, intake, user }
  },
})

/** Public query — no auth required. Used by the shareable page. */
export const getProposalByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, { shareToken }) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", shareToken))
      .first()
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

export const listActivities = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await requireUserId()
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 20)

    return Promise.all(
      activities.map(async (a) => {
        const proposal = a.proposalId ? await ctx.db.get(a.proposalId) : undefined
        const client = a.clientId ? await ctx.db.get(a.clientId) : undefined
        return {
          activity: a,
          proposalTitle: proposal?.title ?? null,
          clientName: client?.name ?? null,
          clientCompany: client?.company ?? null,
        }
      })
    )
  },
})

export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId()

    const [proposals, activities, clients, user] = await Promise.all([
      ctx.db
        .query("proposals")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .collect(),
      ctx.db
        .query("activities")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(5),
      ctx.db
        .query("clients")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .collect(),
      ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first(),
    ])

    const nowDate = new Date()
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime()
    const prevMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1).getTime()

    const thisMonth = proposals.filter((p) => p.createdAt >= monthStart)
    const lastMonth = proposals.filter(
      (p) => p.createdAt >= prevMonthStart && p.createdAt < monthStart
    )

    const sent = proposals.filter((p) => p.status !== "draft")
    const accepted = proposals.filter((p) => p.status === "accepted")
    const winRate = sent.length > 0 ? Math.round((accepted.length / sent.length) * 100) : 0

    const prevSent = lastMonth.filter((p) => p.status !== "draft")
    const prevAccepted = lastMonth.filter((p) => p.status === "accepted")
    const prevWinRate = prevSent.length > 0 ? Math.round((prevAccepted.length / prevSent.length) * 100) : 0

    // Resolve intakes for accepted proposals to sum estimated value.
    let revenue = 0
    for (const p of accepted) {
      const intake = await ctx.db.get(p.intakeId)
      if (intake?.budgetMax) revenue += intake.budgetMax
      else if (intake?.budgetMin) revenue += intake.budgetMin
    }

    const clientsMap = new Map(clients.map((c) => [c._id, c]))

    const recentProposals = proposals.slice(0, 6).map((p) => ({
      proposal: p,
      client: clientsMap.get(p.clientId) ?? null,
    }))

    const activitiesWithNames = await Promise.all(
      activities.map(async (a) => {
        const proposal = a.proposalId ? await ctx.db.get(a.proposalId) : undefined
        const client = a.clientId ? await ctx.db.get(a.clientId) : undefined
        return {
          activity: a,
          proposalTitle: proposal?.title ?? null,
          clientName: client?.name ?? null,
          clientCompany: client?.company ?? null,
        }
      })
    )

    return {
      user,
      totalProposals: proposals.length,
      proposalsThisMonth: thisMonth.length,
      proposalsLastMonth: lastMonth.length,
      winRate,
      prevWinRate,
      hoursSaved: proposals.length * 4,
      acceptedCount: accepted.length,
      sentCount: sent.length,
      revenue,
      recentProposals,
      activities: activitiesWithNames,
    }
  },
})
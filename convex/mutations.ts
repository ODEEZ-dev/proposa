import { v } from "convex/values"
import { mutation } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import { ONBOARDING_SERVICE_TEMPLATES, DEMO_USER_ID } from "./constants"

const categoryValidator = v.union(
  v.literal("web-development"),
  v.literal("design"),
  v.literal("marketing"),
  v.literal("consulting"),
  v.literal("content"),
  v.literal("other")
)
const priceUnitValidator = v.union(v.literal("fixed"), v.literal("hourly"), v.literal("project"))
const timelineValidator = v.union(
  v.literal("1-week"),
  v.literal("2-weeks"),
  v.literal("1-month"),
  v.literal("2-months"),
  v.literal("3-months"),
  v.literal("6-months"),
  v.literal("6-plus-months")
)

const now = () => Date.now()

async function requireUser(): Promise<string> {
  return DEMO_USER_ID
}

function serviceTemplate(name: string) {
  return ONBOARDING_SERVICE_TEMPLATES.find((t) => t.name === name)
}

/** Recompute a client's winRate / totalValue from their proposals. */
async function recomputeClientStats(ctx: any, clientId: Id<"clients">) {
  const client = await ctx.db.get(clientId)
  if (!client) return
  const proposals = await ctx.db
    .query("proposals")
    .withIndex("by_clientId", (q: any) => q.eq("clientId", clientId))
    .collect()
  const sent = proposals.filter((p: Doc<"proposals">) => p.status !== "draft")
  const accepted = proposals.filter((p: Doc<"proposals">) => p.status === "accepted")
  let totalValue = 0
  for (const p of accepted) {
    const intake = await ctx.db.get(p.intakeId)
    if (intake?.budgetMax) totalValue += intake.budgetMax
    else if (intake?.budgetMin) totalValue += intake.budgetMin
  }
  const winRate = sent.length > 0 ? Math.round((accepted.length / sent.length) * 100) : 0
  await ctx.db.patch(clientId, {
    proposalCount: proposals.length,
    winRate,
    totalValue,
    updatedAt: now(),
  })
}

async function recordActivity(
  ctx: any,
  userId: string,
  type: Doc<"activities">["type"],
  opts: { proposalId?: Id<"proposals">; clientId?: Id<"clients">; metadata?: string } = {}
) {
  await ctx.db.insert("activities", {
    userId,
    type,
    proposalId: opts.proposalId,
    clientId: opts.clientId,
    metadata: opts.metadata,
    createdAt: now(),
  })
}

// ────────────────────────────────────────────────────────────────
// Users
// ────────────────────────────────────────────────────────────────

export const upsertUser = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    businessName: v.optional(v.string()),
    tagline: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    defaultTerms: v.optional(v.string()),
    defaultPaymentTerms: v.optional(v.string()),
    defaultProposalExpiryDays: v.optional(v.number()),
    defaultTone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser()
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()

    const patch: Record<string, unknown> = { updatedAt: now() }
    if (args.name !== undefined) patch.name = args.name
    if (args.email !== undefined) patch.email = args.email
    if (args.avatarUrl !== undefined) patch.avatarUrl = args.avatarUrl
    if (args.businessName !== undefined) patch.businessName = args.businessName
    if (args.tagline !== undefined) patch.tagline = args.tagline
    if (args.primaryColor !== undefined) patch.primaryColor = args.primaryColor
    if (args.logoUrl !== undefined) patch.logoUrl = args.logoUrl
    if (args.defaultTerms !== undefined) patch.defaultTerms = args.defaultTerms
    if (args.defaultPaymentTerms !== undefined) patch.defaultPaymentTerms = args.defaultPaymentTerms
    if (args.defaultProposalExpiryDays !== undefined)
      patch.defaultProposalExpiryDays = args.defaultProposalExpiryDays
    if (args.defaultTone !== undefined) patch.defaultTone = args.defaultTone

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }
    const id = await ctx.db.insert("users", {
      userId,
      email: args.email ?? "",
      name: args.name ?? "",
      avatarUrl: args.avatarUrl,
      businessName: args.businessName,
      tagline: args.tagline,
      primaryColor: args.primaryColor ?? "#6366F1",
      logoUrl: args.logoUrl,
      defaultTerms: args.defaultTerms,
      defaultPaymentTerms: args.defaultPaymentTerms,
      defaultProposalExpiryDays: args.defaultProposalExpiryDays ?? 30,
      defaultTone: (args.defaultTone ?? "professional") as Doc<"users">["defaultTone"],
      createdAt: now(),
      updatedAt: now(),
    })
    return id
  },
})

export const completeOnboarding = mutation({
  args: {
    businessName: v.string(),
    serviceNames: v.array(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { businessName, serviceNames, logoUrl }) => {
    const userId = await requireUser()
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first()
    const t = now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        businessName,
        logoUrl: logoUrl ?? existing.logoUrl,
        updatedAt: t,
      })
    } else {
      await ctx.db.insert("users", {
        userId,
        email: "",
        name: "",
        avatarUrl: undefined,
        businessName,
        tagline: undefined,
        primaryColor: "#6366F1",
        logoUrl,
        defaultTerms: undefined,
        defaultPaymentTerms: undefined,
        defaultProposalExpiryDays: 30,
        defaultTone: "professional",
        createdAt: t,
        updatedAt: t,
      })
    }

    for (const name of serviceNames) {
      const template = serviceTemplate(name)
      if (!template) continue
      const exists = await ctx.db
        .query("services")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("name"), template.name))
        .first()
      if (exists) continue
      await ctx.db.insert("services", {
        userId,
        name: template.name,
        description: template.description,
        category: template.category,
        basePrice: undefined,
        priceUnit: "project",
        typicalDuration: undefined,
        deliverables: template.deliverables,
        isActive: true,
        createdAt: t,
        updatedAt: t,
      })
    }
    return true
  },
})

// ────────────────────────────────────────────────────────────────
// Clients
// ────────────────────────────────────────────────────────────────

export const addClient = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    industry: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser()
    const t = now()
    const id = await ctx.db.insert("clients", {
      userId,
      name: args.name,
      email: args.email,
      company: args.company,
      industry: args.industry,
      logoUrl: args.logoUrl,
      notes: args.notes,
      proposalCount: 0,
      totalValue: 0,
      winRate: 0,
      createdAt: t,
      updatedAt: t,
    })
    await recordActivity(ctx, userId, "client_added", { clientId: id })
    return id
  },
})

export const updateClient = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    company: v.optional(v.string()),
    industry: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, ...rest }) => {
    const userId = await requireUser()
    const client = await ctx.db.get(clientId)
    if (!client || client.userId !== userId) throw new Error("Client not found")
    const patch: Record<string, unknown> = { updatedAt: now() }
    for (const [k, val] of Object.entries(rest)) {
      if (val !== undefined) patch[k] = val
    }
    await ctx.db.patch(clientId, patch)
    return clientId
  },
})

export const deleteClient = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const userId = await requireUser()
    const client = await ctx.db.get(clientId)
    if (!client || client.userId !== userId) throw new Error("Client not found")
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .collect()
    for (const p of proposals) {
      await ctx.db.delete(p._id)
      const intake = await ctx.db.get(p.intakeId)
      if (intake) await ctx.db.delete(intake._id)
    }
    await ctx.db.delete(clientId)
    return clientId
  },
})

// ────────────────────────────────────────────────────────────────
// Services
// ────────────────────────────────────────────────────────────────

export const addService = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: categoryValidator,
    basePrice: v.optional(v.number()),
    priceUnit: priceUnitValidator,
    typicalDuration: v.optional(v.string()),
    deliverables: v.array(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser()
    const t = now()
    return ctx.db.insert("services", { ...args, userId, createdAt: t, updatedAt: t })
  },
})

export const updateService = mutation({
  args: {
    serviceId: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(categoryValidator),
    basePrice: v.optional(v.number()),
    priceUnit: v.optional(priceUnitValidator),
    typicalDuration: v.optional(v.string()),
    deliverables: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { serviceId, ...rest }) => {
    const userId = await requireUser()
    const service = await ctx.db.get(serviceId)
    if (!service || service.userId !== userId) throw new Error("Service not found")
    const patch: Record<string, unknown> = { updatedAt: now() }
    for (const [k, val] of Object.entries(rest)) {
      if (val !== undefined) patch[k] = val
    }
    await ctx.db.patch(serviceId, patch)
    return serviceId
  },
})

export const deleteService = mutation({
  args: { serviceId: v.id("services") },
  handler: async (ctx, { serviceId }) => {
    const userId = await requireUser()
    const service = await ctx.db.get(serviceId)
    if (!service || service.userId !== userId) throw new Error("Service not found")
    await ctx.db.delete(serviceId)
    return serviceId
  },
})

// ────────────────────────────────────────────────────────────────
// Project intakes
// ────────────────────────────────────────────────────────────────

export const createIntake = mutation({
  args: {
    clientId: v.id("clients"),
    projectType: v.string(),
    scopeDescription: v.string(),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
    timeline: timelineValidator,
    deliverables: v.array(v.string()),
    specialRequirements: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser()
    const client = await ctx.db.get(args.clientId)
    if (!client || client.userId !== userId) throw new Error("Client not found")
    const t = now()
    const id = await ctx.db.insert("projectIntakes", {
      userId,
      ...args,
      status: "intake",
      createdAt: t,
      updatedAt: t,
    })
    await recordActivity(ctx, userId, "intake_completed", { clientId: args.clientId })
    return id
  },
})

// ────────────────────────────────────────────────────────────────
// Proposals
// ────────────────────────────────────────────────────────────────

const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"

export function generateTokenString(length = 12): string {
  let result = ""
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  for (let i = 0; i < length; i++) {
    result += TOKEN_CHARS[values[i]! % TOKEN_CHARS.length]
  }
  return result
}

async function ensureUniqueShareToken(ctx: any): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateTokenString(12)
    const existing = await ctx.db
      .query("proposals")
      .withIndex("by_shareToken", (q: any) => q.eq("shareToken", token))
      .first()
    if (!existing) return token
  }
  return generateTokenString(16)
}

/** Called by the generateProposal action — inserts the generated proposal. */
export const createProposalFromIntake = mutation({
  args: {
    intakeId: v.id("projectIntakes"),
    title: v.string(),
    content: v.string(),
    aiSummary: v.optional(v.string()),
  },
  handler: async (ctx, { intakeId, title, content, aiSummary }) => {
    const userId = await requireUser()
    const intake = await ctx.db.get(intakeId)
    if (!intake || intake.userId !== userId) throw new Error("Intake not found")

    const t = now()
    const shareToken = await ensureUniqueShareToken(ctx)
    const proposalId = await ctx.db.insert("proposals", {
      userId,
      intakeId,
      clientId: intake.clientId,
      title,
      content,
      aiSummary,
      status: "draft",
      shareToken,
      viewCount: 0,
      lastViewedAt: undefined,
      sentAt: undefined,
      createdAt: t,
      updatedAt: t,
    })
    await ctx.db.patch(intakeId, { status: "generated", updatedAt: t })
    await recordActivity(ctx, userId, "proposal_created", {
      proposalId,
      clientId: intake.clientId,
    })
    await recomputeClientStats(ctx, intake.clientId)
    return proposalId
  },
})

/** Generates/refreshes a unique share token for a proposal (used by the editor). */
export const setShareToken = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const userId = await requireUser()
    const proposal = await ctx.db.get(proposalId)
    if (!proposal || proposal.userId !== userId) throw new Error("Proposal not found")
    const shareToken = await ensureUniqueShareToken(ctx)
    await ctx.db.patch(proposalId, { shareToken, updatedAt: now() })
    return shareToken
  },
})

export const updateProposal = mutation({
  args: {
    proposalId: v.id("proposals"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("sent"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("changes-requested")
      )
    ),
  },
  handler: async (ctx, { proposalId, ...rest }) => {
    const userId = await requireUser()
    const proposal = await ctx.db.get(proposalId)
    if (!proposal || proposal.userId !== userId) throw new Error("Proposal not found")
    const patch: Record<string, unknown> = { updatedAt: now() }
    for (const [k, val] of Object.entries(rest)) {
      if (val !== undefined) patch[k] = val
    }
    await ctx.db.patch(proposalId, patch)
    return proposalId
  },
})

export const deleteProposal = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const userId = await requireUser()
    const proposal = await ctx.db.get(proposalId)
    if (!proposal || proposal.userId !== userId) throw new Error("Proposal not found")
    const intake = await ctx.db.get(proposal.intakeId)
    if (intake) await ctx.db.delete(intake._id)
    await ctx.db.delete(proposalId)
    await recomputeClientStats(ctx, proposal.clientId)
    return proposalId
  },
})

export const sendProposal = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const userId = await requireUser()
    const proposal = await ctx.db.get(proposalId)
    if (!proposal || proposal.userId !== userId) throw new Error("Proposal not found")
    const t = now()
    await ctx.db.patch(proposalId, { status: "sent", sentAt: t, updatedAt: t })
    await ctx.db.patch(proposal.intakeId, { status: "sent", updatedAt: t })
    await recordActivity(ctx, userId, "proposal_sent", {
      proposalId,
      clientId: proposal.clientId,
    })
    return proposalId
  },
})

/** Public — the share link page calls this without auth. */
export const acceptProposalByToken = mutation({
  args: { shareToken: v.string() },
  handler: async (ctx, { shareToken }) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", shareToken))
      .first()
    if (!proposal) throw new Error("Proposal not found")
    if (proposal.status === "accepted") return { ok: true, already: true }
    const t = now()
    await ctx.db.patch(proposal._id, { status: "accepted", updatedAt: t })
    await ctx.db.patch(proposal.intakeId, { status: "accepted", updatedAt: t })
    await recordActivity(ctx, proposal.userId, "proposal_accepted", {
      proposalId: proposal._id,
      clientId: proposal.clientId,
    })
    await recomputeClientStats(ctx, proposal.clientId)
    return { ok: true, already: false }
  },
})

/** Public — the share link page calls this without auth. */
export const requestChangesByToken = mutation({
  args: { shareToken: v.string(), message: v.string() },
  handler: async (ctx, { shareToken, message }) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", shareToken))
      .first()
    if (!proposal) throw new Error("Proposal not found")
    const t = now()
    await ctx.db.patch(proposal._id, { status: "changes-requested", updatedAt: t })
    await ctx.db.patch(proposal.intakeId, { status: "changes-requested", updatedAt: t })
    await recordActivity(ctx, proposal.userId, "proposal_rejected", {
      proposalId: proposal._id,
      clientId: proposal.clientId,
      metadata: JSON.stringify({ kind: "changes-requested", message }),
    })
    return { ok: true }
  },
})

/** Public — increments the view counter on the share page. */
export const recordProposalView = mutation({
  args: { shareToken: v.string() },
  handler: async (ctx, { shareToken }) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", shareToken))
      .first()
    if (!proposal) return null
    const t = now()
    await ctx.db.patch(proposal._id, {
      viewCount: proposal.viewCount + 1,
      lastViewedAt: t,
    })
    return proposal.viewCount + 1
  },
})

// ────────────────────────────────────────────────────────────────
// Migration: emerald → indigo primary color
// ────────────────────────────────────────────────────────────────

const EMERALD = "#10B981"
const INDIGO = "#6366F1"

/** One-time migration: updates all users with emerald primaryColor to indigo. */
export const migratePrimaryColorToIndigo = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect()
    let updated = 0
    for (const user of users) {
      if (user.primaryColor === EMERALD) {
        await ctx.db.patch(user._id, { primaryColor: INDIGO, updatedAt: now() })
        updated++
      }
    }
    return { total: users.length, updated }
  },
})
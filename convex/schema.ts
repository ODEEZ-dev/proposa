import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const toneValues = ["professional", "casual", "friendly", "technical"] as const
export const serviceCategoryValues = [
  "web-development",
  "design",
  "marketing",
  "consulting",
  "content",
  "other",
] as const
export const priceUnitValues = ["fixed", "hourly", "project"] as const
export const timelineValues = [
  "1-week",
  "2-weeks",
  "1-month",
  "2-months",
  "3-months",
  "6-months",
  "6-plus-months",
] as const
export const intakeStatusValues = [
  "intake",
  "generated",
  "sent",
  "accepted",
  "rejected",
  "changes-requested",
] as const
export const proposalStatusValues = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "changes-requested",
] as const
export const activityTypeValues = [
  "proposal_created",
  "proposal_sent",
  "proposal_accepted",
  "proposal_rejected",
  "client_added",
  "intake_completed",
] as const

const literals = <const T extends readonly string[]>(values: T) =>
  v.union(...values.map((value) => v.literal(value as T[number])))

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    businessName: v.optional(v.string()),
    tagline: v.optional(v.string()),
    primaryColor: v.string(),
    logoUrl: v.optional(v.string()),
    defaultTerms: v.optional(v.string()),
    defaultPaymentTerms: v.optional(v.string()),
    defaultProposalExpiryDays: v.number(),
    defaultTone: literals(toneValues),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  clients: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    industry: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    proposalCount: v.number(),
    totalValue: v.number(),
    winRate: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  services: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    category: literals(serviceCategoryValues),
    basePrice: v.optional(v.number()),
    priceUnit: literals(priceUnitValues),
    typicalDuration: v.optional(v.string()),
    deliverables: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  projectIntakes: defineTable({
    userId: v.string(),
    clientId: v.id("clients"),
    projectType: v.string(),
    scopeDescription: v.string(),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
    timeline: literals(timelineValues),
    deliverables: v.array(v.string()),
    specialRequirements: v.optional(v.string()),
    status: literals(intakeStatusValues),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  proposals: defineTable({
    userId: v.string(),
    intakeId: v.id("projectIntakes"),
    clientId: v.id("clients"),
    title: v.string(),
    content: v.string(),
    aiSummary: v.optional(v.string()),
    status: literals(proposalStatusValues),
    shareToken: v.string(),
    viewCount: v.number(),
    lastViewedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_shareToken", ["shareToken"])
    .index("by_clientId", ["clientId"]),

  templates: defineTable({
    userId: v.optional(v.string()),
    name: v.string(),
    industry: v.optional(v.string()),
    structureJson: v.string(),
    tone: literals(toneValues),
    isDefault: v.boolean(),
    isGlobal: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  activities: defineTable({
    userId: v.string(),
    type: literals(activityTypeValues),
    proposalId: v.optional(v.id("proposals")),
    clientId: v.optional(v.id("clients")),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
})
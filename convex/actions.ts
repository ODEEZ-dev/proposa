"use node"

import { v } from "convex/values"
import { action } from "./_generated/server"
import { api, internal } from "./_generated/api"
import OpenAI from "openai"
import { TIMELINE_LABELS, CATEGORY_LABELS, TONE_LABELS, DEMO_USER_ID } from "./constants"

// Cast once at module level: resolving properties on `api`/`internal` while
// inferring this module's own types creates a circular reference (the generated
// api types import this file), so we dereference through `any` here.
const internalApi = internal as any
const publicApi = api as any

async function requireUser(): Promise<string> {
  return DEMO_USER_ID
}

/** Free models to try in order when using OpenRouter. */
const FREE_MODELS = [
  "minimax/minimax-m3:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "poolside/laguna-s-2.1:free",
]

async function complete(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  const openRouterKey = process.env.OPENROUTER_API_KEY
  const openAiKey = process.env.OPENAI_API_KEY

  if (openRouterKey) {
    const client = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: openRouterKey })
    const models = (process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : []).concat(FREE_MODELS)
    let lastErr: unknown = new Error("No model responded")
    for (const model of models) {
      try {
        const res = await client.chat.completions.create({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 3000,
        })
        const text = res.choices[0]?.message?.content ?? ""
        if (text) return text
      } catch (err) {
        lastErr = err
      }
    }
    throw lastErr
  }

  if (openAiKey) {
    const client = new OpenAI({ apiKey: openAiKey })
    const res = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 3000,
    })
    const text = res.choices[0]?.message?.content ?? ""
    if (!text) throw new Error("AI returned an empty response")
    return text
  }

  throw new Error("No AI provider configured — set OPENROUTER_API_KEY or OPENAI_API_KEY")
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractTitle(content: string): string {
  const h1 = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1) return stripHtml(h1[1]!)
  const h2 = content.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
  if (h2) return stripHtml(h2[1]!)
  return "Project Proposal"
}

function extractSummary(content: string): string {
  let text = stripHtml(content)
  // Drop the title so the summary starts with the body copy.
  const title = extractTitle(content)
  if (title && text.startsWith(title)) {
    text = text.slice(title.length).trim()
  }
  // Take the first two sentences.
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? []
  return sentences.slice(0, 2).join(" ").trim() || text.slice(0, 200)
}

/**
 * Offline fallback: builds a clean, well-structured proposal from the intake
 * data when no AI provider is configured or the API call fails.
 */
function buildTemplateProposal(i: any, client: any, services: any[], user: any) {
  const budgetText =
    i.budgetMin && i.budgetMax
      ? `$${i.budgetMin.toLocaleString()} - ${i.budgetMax.toLocaleString()}`
      : "Investment to be discussed"
  const timelineLabel = TIMELINE_LABELS[i.timeline as keyof typeof TIMELINE_LABELS] ?? i.timeline
  const businessName = user?.businessName ?? "our team"
  const paymentTerms = user?.defaultPaymentTerms ?? "50% deposit to begin, remaining balance on delivery"

  const deliverableItems =
    services.length > 0
      ? services
          .map((s) => `<li><strong>${s.name}</strong> — ${s.description}${s.deliverables.length > 0 ? ` (includes: ${s.deliverables.join(", ")})` : ""}</li>`)
          .join("\n")
      : "<li>Detailed discovery and requirements gathering to align on goals</li>"

  const title = `${i.projectType} Proposal for ${client?.name ?? "Your Project"}`
  const content = `
<h1>${title}</h1>

<h2>Executive Summary</h2>
<p>Thank you for the opportunity to share how ${businessName} can help${client?.company ? ` ${client.company}` : ""} achieve its goals. After reviewing your project requirements, we are confident that our approach will deliver measurable results, on time and within the agreed budget.</p>
<p>Your project is a great fit for our process. We combine proven methodology with hands-on expertise to deliver ${i.projectType.toLowerCase()} work that moves the needle — not just deliverables that look good on paper.</p>

<h2>Scope of Work</h2>
<p>Based on your brief, here is exactly what we will deliver:</p>
<ul>
${deliverableItems}
</ul>

<h2>Timeline</h2>
<p>We propose a ${timelineLabel.toLowerCase()} timeline, broken into clear milestones so you always know where things stand:</p>
<ul>
<li><strong>Kickoff &amp; Discovery (Week 1):</strong> Align on goals, gather assets, and lock the plan.</li>
<li><strong>Design &amp; Development:</strong> Core work delivered in focused sprints with check-ins after each milestone.</li>
<li><strong>Review &amp; Revisions:</strong> Two rounds of revisions included, with feedback turned around within 48 hours.</li>
<li><strong>Final Delivery:</strong> Handoff, training, and post-launch support.</li>
</ul>

<h2>Investment</h2>
<p>${budgetText}. This investment covers the full scope outlined above, including all revisions and project management. You get a single point of contact and a dedicated team focused on your success.</p>

<h2>Terms &amp; Conditions</h2>
<p>${paymentTerms}. The proposal is valid for ${user?.defaultProposalExpiryDays ?? 30} days. Revisions beyond the included rounds are billed at our standard hourly rate. Either party may cancel with written notice; work completed to date is billed accordingly.</p>

<h2>Call to Action</h2>
<p>We are ready to get started. ${client?.name ? `${client.name.split(" ")[0]}, ` : ""}accept this proposal to lock in your timeline, and we will kick off within 3 business days. If you have any questions, we are happy to hop on a quick call to walk through the details.</p>
`.trim()

  return { title, content, aiSummary: extractSummary(content) }
}

// ────────────────────────────────────────────────────────────────
// generateProposal
// ────────────────────────────────────────────────────────────────

export const generateProposal = action({
  args: { intakeId: v.id("projectIntakes") },
  handler: async (ctx, { intakeId }) => {
    const userId = await requireUser()

    const intake = await ctx.runQuery(internalApi.internal.getIntakeForAction, { intakeId })
    if (!intake || intake.intake.userId !== userId) throw new Error("Intake not found")

    const { intake: i, client, services, user } = intake

    const deliverablesText =
      services.length > 0
        ? services
            .map(
              (s: any) =>
                `- ${s.name} (${CATEGORY_LABELS[s.category] ?? s.category}): ${s.description}` +
                (s.deliverables.length > 0 ? ` — includes: ${s.deliverables.join(", ")}` : "") +
                (s.basePrice ? ` — from $${s.basePrice} ${s.priceUnit}` : "")
            )
            .join("\n")
        : "No specific services selected from catalog."

    const budgetText =
      i.budgetMin && i.budgetMax
        ? `$${i.budgetMin.toLocaleString()} - $${i.budgetMax.toLocaleString()}`
        : "To be discussed"

    const systemPrompt = `You are an expert proposal writer for freelancers and small agencies. You write persuasive, professional proposals that close deals. You write clean, semantic HTML only — no markdown.`

    const userPrompt = `Write a professional, persuasive proposal based on the following:

CLIENT: ${client.name}, ${client.company ?? "n/a"}, ${client.industry ?? "n/a"}
PROJECT TYPE: ${i.projectType}
SCOPE: ${i.scopeDescription}
BUDGET RANGE: ${budgetText}
TIMELINE: ${TIMELINE_LABELS[i.timeline] ?? i.timeline}
DELIVERABLES: ${deliverablesText}
SPECIAL REQUIREMENTS: ${i.specialRequirements ?? "None"}
TONE: ${TONE_LABELS[user?.defaultTone ?? "professional"] ?? user?.defaultTone}

The freelancer's business is: ${user?.businessName ?? "the freelancer"}. Their tagline is: ${user?.tagline ?? ""}.

Write a complete proposal with these sections:
1. Title (catchy, specific to the project) — use an <h1>
2. Executive Summary (2-3 paragraphs, addressing the client's pain and positioning the freelancer as the solution)
3. Scope of Work (detailed bullet points for each deliverable)
4. Timeline (realistic milestones mapped to the ${TIMELINE_LABELS[i.timeline] ?? i.timeline} timeline)
5. Investment (pricing language — reference the budget range if provided; otherwise say "Investment to be discussed")
6. Terms & Conditions (use professional standard terms: 50% deposit to begin, milestones, ${user?.defaultPaymentTerms ? `payment terms: ${user.defaultPaymentTerms}, ` : ""}revisions policy, cancellation policy)
7. Call to Action (strong, urgent but professional)

Format as clean HTML with <h2> for section headers, <p> for paragraphs, <ul>/<li> for lists.
Do NOT include <html>, <head>, or <body> tags. Just the content HTML.`

    let content: string
    try {
      content = await complete([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ])
    } catch {
      // No AI provider configured or API failed — fall back to a
      // well-structured template so the flow always completes.
      const fb = buildTemplateProposal(i, client, services, user)
      content = fb.content
    }

    const title = extractTitle(content)
    const aiSummary = extractSummary(content)

    const proposalId = await ctx.runMutation(publicApi.mutations.createProposalFromIntake, {
      intakeId,
      title,
      content,
      aiSummary,
    })

    return { proposalId, title }
  },
})

// ────────────────────────────────────────────────────────────────
// aiAssistantChat
// ────────────────────────────────────────────────────────────────

const ACTION_PROMPTS: Record<string, string> = {
  formal:
    "Rewrite the entire proposal in a more formal, corporate tone. Keep the same structure and sections but elevate the language: remove contractions, use more precise business vocabulary, and sound like a top-tier consultancy. Return the full proposal as clean HTML with the same section headers.",
  urgency:
    "Add professional urgency language throughout this proposal without being pushy or salesy. Mention availability, timeline implications, and why acting soon benefits the client. Keep the same structure and return the full proposal as clean HTML.",
  reduce_scope:
    "Suggest how to reduce the scope by 20% while maintaining core value. Return a concise list of specific items to cut or defer, plus a short explanation of what stays. Do NOT rewrite the whole proposal — just return the suggestions as an HTML list.",
  payment_terms:
    "Add clear payment terms and a milestone-based payment schedule to the Investment section. Include a professional breakdown (e.g., 50% deposit, 25% at midpoint, 25% on delivery) and return the full proposal as clean HTML with the updated Investment section.",
  follow_up:
    "Generate a short, professional follow-up email template to send to the client about this proposal. Keep it warm and under 150 words. Return it as HTML with <p> tags, ready to copy into an email client.",
}

export const aiAssistantChat = action({
  args: {
    proposalId: v.id("proposals"),
    message: v.string(),
    actionType: v.optional(
      v.union(
        v.literal("formal"),
        v.literal("urgency"),
        v.literal("reduce_scope"),
        v.literal("payment_terms"),
        v.literal("follow_up")
      )
    ),
  },
  handler: async (ctx, { proposalId, message, actionType }) => {
    const userId = await requireUser()

    const data = await ctx.runQuery(internalApi.internal.getProposalForAction, { proposalId })
    if (!data || data.proposal.userId !== userId) throw new Error("Proposal not found")

    const { proposal, client, intake } = data

    let systemPrompt: string
    let userPrompt: string
    let replaceContent = false

    if (actionType && ACTION_PROMPTS[actionType]) {
      systemPrompt = ACTION_PROMPTS[actionType]!
      userPrompt = `Here is the current proposal:\n\n${proposal.content}`
      replaceContent = ["formal", "urgency", "payment_terms"].includes(actionType)
    } else {
      systemPrompt = `You are an expert proposal-writing assistant embedded inside a proposal editor. You help freelancers improve their proposals. You know the full context of the proposal being edited. Respond with clear, actionable help. When you suggest rewritten text, provide it as clean HTML. Keep responses concise and professional.`
      userPrompt = `PROPOSAL TITLE: ${proposal.title}\nCLIENT: ${client?.name ?? "Unknown"}, ${client?.company ?? ""}\nPROJECT TYPE: ${intake?.projectType ?? ""}\nTIMELINE: ${intake ? (TIMELINE_LABELS[intake.timeline as keyof typeof TIMELINE_LABELS] ?? intake.timeline) : ""}\nBUDGET: ${intake?.budgetMin ? `$${intake.budgetMin.toLocaleString()} - ${intake.budgetMax?.toLocaleString() ?? ""}` : "To be discussed"}\n\nCURRENT PROPOSAL CONTENT:\n${proposal.content}\n\nUSER MESSAGE: ${message}`
    }

    let text: string
    try {
      text = await complete([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ])
    } catch {
      // Offline fallback so the assistant stays usable without an API key.
      text = buildAssistantFallback(actionType, message, proposal)
    }

    return { text, replaceContent }
  },
})

/** Offline fallback responses for the AI assistant when no provider is configured. */
function buildAssistantFallback(actionType: string | undefined, _message: string, proposal: any): string {
  if (actionType === "follow_up") {
    return `<p>Subject: Following up on your ${proposal.title}</p><p>Hi there,</p><p>I wanted to follow up on the proposal I sent for <strong>${proposal.title}</strong>. I'd love to answer any questions you have and walk you through the details.</p><p>If it's helpful, I can adjust the scope, timeline, or budget to better fit your needs. Just let me know — I'm happy to hop on a quick call this week.</p><p>Looking forward to hearing from you!</p>`
  }
  if (actionType === "formal") {
    return `<p>To make this proposal more formal, consider the following edits:</p><ul><li>Replace first-person contractions ("we'll", "it's") with full forms ("we will", "it is").</li><li>Open the Executive Summary with a confident statement of value rather than thanks.</li><li>Use precise language like "deliverables" instead of "things we do" and "engagement" instead of "gig".</li><li>Close with a clear, confident next step rather than a soft invitation.</li></ul>`
  }
  if (actionType === "urgency") {
    return `<p>To add professional urgency without being pushy:</p><ul><li>Add a line noting your current availability: "We are currently booking projects for the next two weeks and can reserve a start slot for you."</li><li>Reference the proposal's validity window in the Terms section.</li><li>In the Call to Action, offer a specific kickoff date rather than a vague "soon".</li></ul>`
  }
  if (actionType === "reduce_scope") {
    return `<p>Here is how to reduce scope by 20% while keeping core value:</p><ul><li>Cut the optional polish phase (advanced animations, extra revision rounds) — keep it as a paid add-on.</li><li>Defer non-critical deliverables like advanced analytics setup to a Phase 2.</li><li>Reduce included revisions from two rounds to one.</li><li>Shorten the support window from 30 days to 14 days.</li></ul>`
  }
  if (actionType === "payment_terms") {
    return `<p>Recommended payment schedule:</p><ul><li>50% deposit to reserve the start date and begin work.</li><li>25% at the midpoint milestone (upon approval of the core deliverable).</li><li>25% on final delivery, before handoff.</li></ul><p>All payments are due within 14 days of invoice. Work does not begin on the next milestone until the previous invoice is settled.</p>`
  }
  return `<p>Here are a few suggestions for this proposal:</p><ul><li>Lead with the client's outcome, not your process.</li><li>Quantify results where possible ("a faster site that converts").</li><li>Keep each section scannable with short paragraphs and bullet lists.</li><li>End with one clear next step.</li></ul><p>Ask me to make it more formal, add urgency, reduce scope, add payment terms, or generate a follow-up email.</p>`
}

// ────────────────────────────────────────────────────────────────
// generateShareToken
// ────────────────────────────────────────────────────────────────

export const generateShareToken = action({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    await requireUser()
    const token = await ctx.runMutation(publicApi.mutations.setShareToken, { proposalId })
    const siteUrl = process.env.VITE_CONVEX_SITE_URL ?? process.env.SITE_URL ?? ""
    const base = siteUrl || ""
    return {
      token,
      url: `${base}/p/${token}`,
      relativeUrl: `/p/${token}`,
    }
  },
})
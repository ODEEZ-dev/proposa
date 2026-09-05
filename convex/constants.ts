export const PROJECT_TYPES = [
  "Website",
  "Mobile App",
  "Branding",
  "Marketing Campaign",
  "Consulting",
  "Content Creation",
  "Other",
] as const

export const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Education",
  "Other",
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  "web-development": "Web Development",
  design: "Design",
  marketing: "Marketing",
  consulting: "Consulting",
  content: "Content",
  other: "Other",
}

export const TIMELINE_LABELS: Record<string, string> = {
  "1-week": "1 week",
  "2-weeks": "2 weeks",
  "1-month": "1 month",
  "2-months": "2 months",
  "3-months": "3 months",
  "6-months": "6 months",
  "6-plus-months": "6+ months",
}

export const TONE_LABELS: Record<string, string> = {
  professional: "Professional",
  casual: "Casual",
  friendly: "Friendly",
  technical: "Technical",
}

export const PRICE_UNIT_LABELS: Record<string, string> = {
  fixed: "Fixed",
  hourly: "Hourly",
  project: "Project",
}

export const BUDGET_MIN = 500
export const BUDGET_MAX = 100000

/**
 * Single-user demo mode: all requests act as this user.
 * No authentication is required.
 */
export const DEMO_USER_ID = "demo-user"

/** Predefined service templates offered during onboarding. */
export const ONBOARDING_SERVICE_TEMPLATES: {
  name: string
  category: "web-development" | "design" | "marketing" | "consulting" | "content" | "other"
  description: string
  deliverables: string[]
}[] = [
  {
    name: "Website Design & Development",
    category: "web-development",
    description: "Custom, responsive websites built to convert visitors into customers.",
    deliverables: ["Custom design", "Responsive development", "CMS integration", "SEO basics"],
  },
  {
    name: "Brand Identity Design",
    category: "design",
    description: "Logo, color palette, and typography systems that make your brand memorable.",
    deliverables: ["Logo suite", "Brand guidelines", "Color & type system"],
  },
  {
    name: "Social Media Marketing",
    category: "marketing",
    description: "Strategy, content calendars, and campaigns that grow your audience.",
    deliverables: ["Content calendar", "Campaign strategy", "Monthly analytics"],
  },
  {
    name: "Business Consulting",
    category: "consulting",
    description: "Focused strategy sessions to clarify positioning, pricing, and growth.",
    deliverables: ["Discovery workshop", "Strategy report", "Action plan"],
  },
  {
    name: "Content Writing",
    category: "content",
    description: "Blog posts, web copy, and email sequences written to engage and convert.",
    deliverables: ["SEO articles", "Web copy", "Email sequences"],
  },
]
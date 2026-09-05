import { useEffect, useRef, useState } from "react"
import { useAction } from "convex/react"
import { api } from "../../convex/_generated/api"
import {
  Wand2,
  Briefcase,
  Flame,
  Scissors,
  CreditCard,
  Mail,
  Send,
  Loader2,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  replaceContent?: boolean
  applied?: boolean
}

const QUICK_ACTIONS = [
  { label: "Make more formal", action: "formal", icon: Briefcase },
  { label: "Add urgency", action: "urgency", icon: Flame },
  { label: "Reduce scope by 20%", action: "reduce_scope", icon: Scissors },
  { label: "Add payment terms", action: "payment_terms", icon: CreditCard },
  { label: "Follow-up email", action: "follow_up", icon: Mail },
] as const

let idCounter = 0
const nextId = () => `msg-${++idCounter}`

export function AiAssistant({
  proposalId,
  onApplyContent,
}: {
  proposalId: string
  onApplyContent: (html: string) => void
}) {
  const aiChat = useAction(api.actions.aiAssistantChat)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  const send = async (content: string, actionType?: (typeof QUICK_ACTIONS)[number]["action"]) => {
    const trimmed = content.trim()
    if (!trimmed || loading) return
    setInput("")
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: trimmed }])
    setLoading(true)
    try {
      const { text, replaceContent } = await aiChat({ proposalId: proposalId as any, message: trimmed, actionType })
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: text, replaceContent },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: "Sorry, I ran into an error. Please try again.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const applyContent = (msgId: string, html: string) => {
    onApplyContent(html)
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m)))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-gradient-to-r from-primary/15 to-card px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <Wand2 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Proposal Editor</p>
          <p className="text-xs text-muted-foreground">Edit and refine your proposal</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5 border-b p-2.5">
        {QUICK_ACTIONS.map(({ label, action, icon: Icon }) => (
          <button
            key={action}
            onClick={() => send(label, action)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-secondary/50 p-3">
        {messages.length === 0 && (
          <div className="mt-6 px-3 text-center">
            <Wand2 className="mx-auto h-6 w-6 text-primary/60" />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Ask me to rewrite sections, tighten the tone, add payment terms, or draft a follow-up email.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "rounded-br-md bg-primary text-white"
                  : "rounded-bl-md bg-card text-foreground shadow-sm ring-1 ring-border"
              )}
            >
              {m.role === "assistant" && m.replaceContent && !m.applied ? (
                <div className="mb-1">
                  <div className="paper overflow-hidden rounded-lg">
                    <div
                      className="prose-proposal max-h-48 overflow-y-auto p-3 text-[13px]"
                      dangerouslySetInnerHTML={{ __html: m.content }}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => applyContent(m.id, m.content)}
                  >
                    <Check className="h-4 w-4" /> Apply to proposal
                  </Button>
                </div>
              ) : m.role === "assistant" && m.replaceContent && m.applied ? (
                <div>
                  <div className="paper overflow-hidden rounded-lg opacity-80">
                    <div
                      className="prose-proposal max-h-48 overflow-y-auto p-3 text-[13px]"
                      dangerouslySetInnerHTML={{ __html: m.content }}
                    />
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                    <Check className="h-3 w-3" /> Applied
                  </p>
                </div>
              ) : (
                <div
                  className={cn(
                    m.role === "assistant" && "prose-chat text-[13px]"
                  )}
                  dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br/>") }}
                />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-card px-4 py-3 shadow-sm ring-1 ring-border">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void send(input)
              }
            }}
            placeholder="Ask me to modify your proposal..."
            rows={2}
            className="resize-none text-sm"
          />
          <Button
            size="icon"
            onClick={() => void send(input)}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="h-9 w-9 shrink-0"
          >
            {loading ? <X className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
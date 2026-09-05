import { useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo2,
  Redo2,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ToolbarItem = {
  label: string
  icon: LucideIcon
  exec: () => void
}

function run(command: string, value?: string) {
  document.execCommand(command, false, value)
}

const TOOLBAR: ToolbarItem[] = [
  { label: "Bold", icon: Bold, exec: () => run("bold") },
  { label: "Italic", icon: Italic, exec: () => run("italic") },
  { label: "Underline", icon: Underline, exec: () => run("underline") },
  { label: "Strikethrough", icon: Strikethrough, exec: () => run("strikeThrough") },
  { label: "H1", icon: Heading1, exec: () => run("formatBlock", "h1") },
  { label: "H2", icon: Heading2, exec: () => run("formatBlock", "h2") },
  { label: "H3", icon: Heading3, exec: () => run("formatBlock", "h3") },
  { label: "Bullet list", icon: List, exec: () => run("insertUnorderedList") },
  { label: "Numbered list", icon: ListOrdered, exec: () => run("insertOrderedList") },
  { label: "Quote", icon: Quote, exec: () => run("formatBlock", "blockquote") },
  { label: "Link", icon: LinkIcon, exec: () => {
      const url = window.prompt("Link URL", "https://")
      if (url) run("createLink", url)
    } },
  { label: "Undo", icon: Undo2, exec: () => run("undo") },
  { label: "Redo", icon: Redo2, exec: () => run("redo") },
]

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  const exec = (fn: () => void) => {
    ref.current?.focus()
    fn()
    if (ref.current) onChange(ref.current.innerHTML)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
      <TooltipProvider delayDuration={120}>
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-slate-50/95 p-1.5 backdrop-blur">
          {TOOLBAR.map(({ label, icon: Icon, exec: fn }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => exec(fn)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          "prose-proposal min-h-0 flex-1 overflow-y-auto px-6 py-6 text-[15px] outline-none",
          !value && "before:pointer-events-none before:absolute before:text-slate-400 before:content-[attr(data-placeholder)]"
        )}
        data-placeholder={placeholder ?? "Write your proposal..."}
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
    </div>
  )
}
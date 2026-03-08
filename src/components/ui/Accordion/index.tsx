"use client"
import { CSSProperties, ReactNode, SyntheticEvent } from "react"

type AccordionProps = {
  summary: string | ReactNode
  body: string | ReactNode
  name?: string
  defaultOpen?: boolean
  mode?: "single" | "multiple"
  summaryClassName?: string
  detailsClassName?: string
  bodyClassName?: string
  summaryStyle?: CSSProperties
  bodyStyle?: CSSProperties
  onToggle?: (event: SyntheticEvent<HTMLDetailsElement>) => void
}

export const Accordion = ({
  summary,
  body,
  name = "info",
  defaultOpen = false,
  mode = "single",
  summaryClassName = "",
  detailsClassName = "",
  bodyClassName = "",
  summaryStyle,
  bodyStyle,
  onToggle,
}: AccordionProps) => {
  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const detailsElement = event.currentTarget
    if (detailsElement.open) {
      detailsElement.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    onToggle?.(event)
  }

  const detailsName = mode === "single" ? name : undefined

  return (
    <details
      name={detailsName}
      open={defaultOpen}
      onToggle={handleToggle}
      className={detailsClassName}
    >
      <summary className={summaryClassName} style={summaryStyle}>
        {summary}
      </summary>
      <div className={bodyClassName} style={bodyStyle}>
        {body}
      </div>
    </details>
  )
}

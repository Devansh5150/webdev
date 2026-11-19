import type { ReactNode } from "react";
export default function GlassPanel({ children, className = "", as: Tag = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "aside" } & React.HTMLAttributes<HTMLElement>) {
  return <Tag className={`glass ${className}`} {...rest}>{children}</Tag>;
}

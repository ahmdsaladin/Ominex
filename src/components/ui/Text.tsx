import { cn } from "@/lib/utils";

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: "p" | "span" | "div";
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
  align?: "left" | "center" | "right" | "justify";
  truncate?: boolean;
  color?: "primary" | "secondary" | "muted" | "accent" | "destructive";
}

export function Text({
  className,
  as: Component = "p",
  size = "base",
  weight = "normal",
  align = "left",
  truncate = false,
  color = "primary",
  ...props
}: TextProps) {
  return (
    <Component
      className={cn(
        {
          "text-xs": size === "xs",
          "text-sm": size === "sm",
          "text-base": size === "base",
          "text-lg": size === "lg",
          "text-xl": size === "xl",
          "text-2xl": size === "2xl",
          "text-3xl": size === "3xl",
          "font-normal": weight === "normal",
          "font-medium": weight === "medium",
          "font-semibold": weight === "semibold",
          "font-bold": weight === "bold",
          "text-left": align === "left",
          "text-center": align === "center",
          "text-right": align === "right",
          "text-justify": align === "justify",
          "truncate": truncate,
          "text-foreground": color === "primary",
          "text-muted-foreground": color === "secondary",
          "text-muted": color === "muted",
          "text-accent-foreground": color === "accent",
          "text-destructive": color === "destructive",
        },
        className
      )}
      {...props}
    />
  );
} 
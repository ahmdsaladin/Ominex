import { cn } from "@/lib/utils";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
  weight?: "normal" | "medium" | "semibold" | "bold";
  align?: "left" | "center" | "right";
  color?: "primary" | "secondary" | "muted" | "accent" | "destructive";
}

export function Heading({
  className,
  as: Component = "h2",
  size = "xl",
  weight = "bold",
  align = "left",
  color = "primary",
  ...props
}: HeadingProps) {
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
          "text-4xl": size === "4xl",
          "text-5xl": size === "5xl",
          "text-6xl": size === "6xl",
          "font-normal": weight === "normal",
          "font-medium": weight === "medium",
          "font-semibold": weight === "semibold",
          "font-bold": weight === "bold",
          "text-left": align === "left",
          "text-center": align === "center",
          "text-right": align === "right",
          "text-foreground": color === "primary",
          "text-muted-foreground": color === "secondary",
          "text-muted": color === "muted",
          "text-accent-foreground": color === "accent",
          "text-destructive": color === "destructive",
        },
        "tracking-tight",
        className
      )}
      {...props}
    />
  );
} 
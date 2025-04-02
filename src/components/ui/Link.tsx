import NextLink from "next/link";
import { cn } from "@/lib/utils";

interface LinkProps extends React.ComponentProps<typeof NextLink> {
  variant?: "default" | "muted" | "destructive";
  size?: "sm" | "base" | "lg";
  underline?: boolean;
}

export function Link({
  className,
  variant = "default",
  size = "base",
  underline = false,
  ...props
}: LinkProps) {
  return (
    <NextLink
      className={cn(
        "inline-flex items-center gap-1 transition-colors",
        {
          "text-primary hover:text-primary/80": variant === "default",
          "text-muted-foreground hover:text-muted-foreground/80":
            variant === "muted",
          "text-destructive hover:text-destructive/80":
            variant === "destructive",
          "text-sm": size === "sm",
          "text-base": size === "base",
          "text-lg": size === "lg",
          "hover:underline": underline,
        },
        className
      )}
      {...props}
    />
  );
} 
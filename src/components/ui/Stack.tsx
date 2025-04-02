import { cn } from "@/lib/utils";

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
}

export function Stack({
  className,
  spacing = 4,
  align = "start",
  justify = "start",
  ...props
}: StackProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        {
          "items-start": align === "start",
          "items-center": align === "center",
          "items-end": align === "end",
          "items-stretch": align === "stretch",
          "justify-start": justify === "start",
          "justify-center": justify === "center",
          "justify-end": justify === "end",
          "justify-between": justify === "between",
          "justify-around": justify === "around",
          "justify-evenly": justify === "evenly",
          "space-y-0": spacing === 0,
          "space-y-1": spacing === 1,
          "space-y-2": spacing === 2,
          "space-y-3": spacing === 3,
          "space-y-4": spacing === 4,
          "space-y-5": spacing === 5,
          "space-y-6": spacing === 6,
          "space-y-8": spacing === 8,
          "space-y-10": spacing === 10,
          "space-y-12": spacing === 12,
          "space-y-16": spacing === 16,
        },
        className
      )}
      {...props}
    />
  );
} 
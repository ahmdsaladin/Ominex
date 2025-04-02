import { cn } from "@/lib/utils";

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
  sm?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  md?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  lg?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  xl?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  "2xl"?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
}

export function Grid({
  className,
  cols = 1,
  gap = 4,
  sm,
  md,
  lg,
  xl,
  "2xl": twoXl,
  ...props
}: GridProps) {
  return (
    <div
      className={cn(
        "grid",
        {
          "grid-cols-1": cols === 1,
          "grid-cols-2": cols === 2,
          "grid-cols-3": cols === 3,
          "grid-cols-4": cols === 4,
          "grid-cols-5": cols === 5,
          "grid-cols-6": cols === 6,
          "grid-cols-7": cols === 7,
          "grid-cols-8": cols === 8,
          "grid-cols-9": cols === 9,
          "grid-cols-10": cols === 10,
          "grid-cols-11": cols === 11,
          "grid-cols-12": cols === 12,
          "gap-0": gap === 0,
          "gap-1": gap === 1,
          "gap-2": gap === 2,
          "gap-3": gap === 3,
          "gap-4": gap === 4,
          "gap-5": gap === 5,
          "gap-6": gap === 6,
          "gap-8": gap === 8,
          "gap-10": gap === 10,
          "gap-12": gap === 12,
          "gap-16": gap === 16,
          "sm:grid-cols-1": sm === 1,
          "sm:grid-cols-2": sm === 2,
          "sm:grid-cols-3": sm === 3,
          "sm:grid-cols-4": sm === 4,
          "sm:grid-cols-5": sm === 5,
          "sm:grid-cols-6": sm === 6,
          "sm:grid-cols-7": sm === 7,
          "sm:grid-cols-8": sm === 8,
          "sm:grid-cols-9": sm === 9,
          "sm:grid-cols-10": sm === 10,
          "sm:grid-cols-11": sm === 11,
          "sm:grid-cols-12": sm === 12,
          "md:grid-cols-1": md === 1,
          "md:grid-cols-2": md === 2,
          "md:grid-cols-3": md === 3,
          "md:grid-cols-4": md === 4,
          "md:grid-cols-5": md === 5,
          "md:grid-cols-6": md === 6,
          "md:grid-cols-7": md === 7,
          "md:grid-cols-8": md === 8,
          "md:grid-cols-9": md === 9,
          "md:grid-cols-10": md === 10,
          "md:grid-cols-11": md === 11,
          "md:grid-cols-12": md === 12,
          "lg:grid-cols-1": lg === 1,
          "lg:grid-cols-2": lg === 2,
          "lg:grid-cols-3": lg === 3,
          "lg:grid-cols-4": lg === 4,
          "lg:grid-cols-5": lg === 5,
          "lg:grid-cols-6": lg === 6,
          "lg:grid-cols-7": lg === 7,
          "lg:grid-cols-8": lg === 8,
          "lg:grid-cols-9": lg === 9,
          "lg:grid-cols-10": lg === 10,
          "lg:grid-cols-11": lg === 11,
          "lg:grid-cols-12": lg === 12,
          "xl:grid-cols-1": xl === 1,
          "xl:grid-cols-2": xl === 2,
          "xl:grid-cols-3": xl === 3,
          "xl:grid-cols-4": xl === 4,
          "xl:grid-cols-5": xl === 5,
          "xl:grid-cols-6": xl === 6,
          "xl:grid-cols-7": xl === 7,
          "xl:grid-cols-8": xl === 8,
          "xl:grid-cols-9": xl === 9,
          "xl:grid-cols-10": xl === 10,
          "xl:grid-cols-11": xl === 11,
          "xl:grid-cols-12": xl === 12,
          "2xl:grid-cols-1": twoXl === 1,
          "2xl:grid-cols-2": twoXl === 2,
          "2xl:grid-cols-3": twoXl === 3,
          "2xl:grid-cols-4": twoXl === 4,
          "2xl:grid-cols-5": twoXl === 5,
          "2xl:grid-cols-6": twoXl === 6,
          "2xl:grid-cols-7": twoXl === 7,
          "2xl:grid-cols-8": twoXl === 8,
          "2xl:grid-cols-9": twoXl === 9,
          "2xl:grid-cols-10": twoXl === 10,
          "2xl:grid-cols-11": twoXl === 11,
          "2xl:grid-cols-12": twoXl === 12,
        },
        className
      )}
      {...props}
    />
  );
} 
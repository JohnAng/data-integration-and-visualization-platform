import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Teach tailwind-merge about the project's custom type-scale tokens so
 * size utilities like `text-body` do not eat colour utilities like
 * `text-cream`. Without this, twMerge treats every `text-*` class as a
 * font-size class and only keeps the last one, which would strip
 * `text-cream` off a Button that also carries `text-body` for sizing.
 */
const PROJECT_FONT_SIZES = [
    "display",
    "h1",
    "h2",
    "h3",
    "h4",
    "lede",
    "body",
    "body-sm",
    "caption",
    "metric",
    "metric-sm",
    "mono",
] as const;

const customTwMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            "font-size": [{ text: [...PROJECT_FONT_SIZES] }],
        },
    },
});

/**
 * Tiny helper that combines clsx (conditional class strings) with
 * tailwind-merge (collapses conflicting Tailwind utilities). Every UI
 * primitive uses it so consumers can pass `className` overrides that
 * win over the component's defaults.
 */
export function cn(...inputs: ClassValue[]): string {
    return customTwMerge(clsx(inputs));
}

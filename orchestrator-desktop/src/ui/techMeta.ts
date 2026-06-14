import type { ProjectType } from "../api/types";
import type { DropdownOption } from "./Dropdown";
import { Icon } from "./Icons";

export type TechVisual = {
  label: string;
  icon: keyof typeof Icon;
  color: string;
};

const TECH_META: Record<ProjectType, TechVisual> = {
  SPRING_BOOT: { label: "Spring", icon: "Java", color: "text-orange-400" },
  NEXT: { label: "Next", icon: "Next", color: "text-white" },
  NEST: { label: "Nest", icon: "Nest", color: "text-red-400" },
  REMIX: { label: "Remix", icon: "Remix", color: "text-sky-400" },
  ANGULAR: { label: "Angular", icon: "Angular", color: "text-red-500" },
  ASTRO: { label: "Astro", icon: "Astro", color: "text-orange-400" },
  SVELTE: { label: "Svelte", icon: "Svelte", color: "text-orange-500" },
  EXPRESS: { label: "Express", icon: "Express", color: "text-slate-200" },
  FASTIFY: { label: "Fastify", icon: "Fastify", color: "text-emerald-300" },
  HONO: { label: "Hono", icon: "Hono", color: "text-amber-400" },
  REACT: { label: "React", icon: "ReactIcon", color: "text-cyan-400" },
  VUE: { label: "Vue", icon: "Vue", color: "text-emerald-400" },
  STATIC_HTML: { label: "HTML", icon: "Globe", color: "text-amber-400" },
  STANDALONE_JS: { label: "JS", icon: "Code", color: "text-yellow-400" },
  LARAVEL: { label: "Laravel", icon: "Code", color: "text-red-400" },
  SYMFONY: { label: "Symfony", icon: "Code", color: "text-violet-400" },
  PHP_COMPOSER: { label: "PHP", icon: "Code", color: "text-indigo-400" },
  STANDALONE_PHP: { label: "PHP", icon: "Code", color: "text-indigo-300" },
  UNKNOWN: { label: "Node", icon: "Box", color: "text-slate-400" },
};

export const TECH_FILTER_ORDER: ProjectType[] = [
  "SPRING_BOOT",
  "NEXT",
  "NEST",
  "REMIX",
  "ANGULAR",
  "ASTRO",
  "SVELTE",
  "EXPRESS",
  "FASTIFY",
  "HONO",
  "REACT",
  "VUE",
  "STATIC_HTML",
  "STANDALONE_JS",
  "LARAVEL",
  "SYMFONY",
  "PHP_COMPOSER",
  "STANDALONE_PHP",
  "UNKNOWN",
];

export function techVisual(projectType?: ProjectType): TechVisual {
  return TECH_META[projectType ?? "SPRING_BOOT"] ?? TECH_META.UNKNOWN;
}

export function buildTechFilterOptions(available: ProjectType[]): DropdownOption<ProjectType>[] {
  return TECH_FILTER_ORDER.filter((type) => available.includes(type)).map((type) => ({
    value: type,
    label: TECH_META[type].label,
    icon: TECH_META[type].icon,
    iconClassName: TECH_META[type].color,
  }));
}

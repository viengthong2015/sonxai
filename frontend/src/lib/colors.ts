/**
 * Accent colours an editor can pick for cards, stats and badges.
 * The stored keys are unchanged (so existing content keeps working); the colours now come
 * from the school logo. Full class strings are listed so Tailwind keeps them.
 */
/** Marks admin wording for the translation catalog (translated where it is shown). */
const msg = (s: string) => s;

export const COLOR_OPTIONS = [
  { value: 'brand', label: msg('Blue'), swatch: 'bg-lapis-700' },
  { value: 'emerald', label: msg('Green'), swatch: 'bg-leaf-600' },
  { value: 'amber', label: msg('Orange'), swatch: 'bg-marigold-500' },
  { value: 'rose', label: msg('Magenta'), swatch: 'bg-hibiscus-600' },
  { value: 'teal', label: msg('Sky'), swatch: 'bg-sky-600' },
  { value: 'sky', label: msg('Light sky'), swatch: 'bg-sky-400' },
  { value: 'violet', label: msg('Violet'), swatch: 'bg-violet-600' },
] as const;

type ColorMap = Record<string, string>;
const pick = (map: ColorMap, color: string | undefined) => map[color ?? ''] ?? map.brand;

/** Notebook spine / solid accent. */
const SPINE: ColorMap = {
  brand: 'bg-lapis-700',
  emerald: 'bg-leaf-600',
  teal: 'bg-sky-600',
  amber: 'bg-marigold-500',
  rose: 'bg-hibiscus-600',
  sky: 'bg-sky-400',
  violet: 'bg-violet-600',
};
/** Text in the accent colour, dark enough for body-size contrast on white. */
const TEXT: ColorMap = {
  brand: 'text-lapis-700',
  emerald: 'text-leaf-700',
  teal: 'text-sky-700',
  amber: 'text-marigold-700',
  rose: 'text-hibiscus-700',
  sky: 'text-sky-700',
  violet: 'text-violet-700',
};
/** Icon colour on the lapis board (hero badges). */
const ON_BOARD: ColorMap = {
  brand: 'text-white',
  emerald: 'text-leaf-300',
  teal: 'text-sky-300',
  amber: 'text-marigold-300',
  rose: 'text-hibiscus-300',
  sky: 'text-sky-200',
  violet: 'text-violet-300',
};

export const spineClass = (c?: string) => pick(SPINE, c);
export const accentTextClass = (c?: string) => pick(TEXT, c);
export const onBoardClass = (c?: string) => pick(ON_BOARD, c);

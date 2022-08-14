import { es, IValue, TValueInstructions } from "./types";

/**
 * The prefix for internal variables inside the compiler output
 */
export const internalPrefix = "&";
export const discardedName = `${internalPrefix}_`;

/**
 * Returns a string that has the format: [line]:[column].
 *
 * If `name` is provided, and it is a string, the resulting string will
 * have the format: [name]:[line]:[column].
 */
export function nodeName(node: es.Node, name?: false | string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { line, column } = node.loc!.start;
  if (typeof name === "string") return `${name}:${line}:${column}`;
  return `${line}:${column}`;
}

/**
 * Converts a camel case string into a dash case one.
 *
 * As an example `camelCase` becomes `camel-case`
 * @example
 * ```
 * camelToDashCase("camelCase") // returns "camel-case"
 * ```
 */
export function camelToDashCase(name: string) {
  return name.replace(/[A-Z]/g, str => `-${str.toLowerCase()}`);
}

export const itemNames = [
  "copper",
  "lead",
  "metaglass",
  "graphite",
  "sand",
  "coal",
  "titanium",
  "thorium",
  "scrap",
  "silicon",
  "plastanium",
  "phaseFabric",
  "surgeAlloy",
  "sporePod",
  "blastCompound",
  "pyratite",
];

/**
 * A more type safe version of `Object.assign`
 */
export function assign<T>(
  obj: T,
  props: {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T as T[K] extends Function ? never : K]?: T[K];
  }
): T {
  return Object.assign(obj, props);
}

export function appendSourceLocations<T extends IValue | null>(
  valueInst: TValueInstructions<T>,
  node: es.Node
): TValueInstructions<T> {
  for (const inst of valueInst[1]) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    inst.source ??= node.loc!;
  }
  return valueInst;
}

export function withAlwaysRuns<T extends IValue | null>(
  valueInst: TValueInstructions<T>,
  value: boolean
) {
  valueInst[1].forEach(inst => (inst.alwaysRuns = value));
  return valueInst;
}

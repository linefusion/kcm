import * as path from "https://deno.land/std@0.204.0/path/mod.ts";
import type { ElementType } from "./types.ts";
import { expandHomeDir } from "./home.ts";

export function toArray<Value, Previous>(
  value: Value,
  previous: Previous
): Array<(ElementType<Previous> | ElementType<Value>) & {}> {
  return [
    ...(Array.isArray(value) ? value : [value]),
    ...(Array.isArray(previous) ? previous : []),
  ].filter(Boolean);
}

export function toPath<Value extends string | string[]>(value: Value): Value {
  return <Value>(
    (Array.isArray(value)
      ? value.map((v) => path.resolve(expandHomeDir(v)))
      : path.resolve(expandHomeDir(value)))
  );
}

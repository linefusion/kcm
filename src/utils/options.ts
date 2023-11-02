import * as path from "@std/path/mod.ts";
import type { ElementType } from "@kcm/utils/types.ts";
import { expandHomeDir } from "@kcm/utils/home.ts";

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

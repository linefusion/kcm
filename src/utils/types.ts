export type ElementType<T> = T extends Array<unknown> ? T[number] : T;

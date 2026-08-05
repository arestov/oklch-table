/** Returns a required value or fails at the boundary where an invariant was broken. */
export function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

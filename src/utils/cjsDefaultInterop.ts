/**
 * CJS default-export interop helper.
 *
 * Vite 8 + Rolldown sometimes pre-bundles CJS-only packages with
 * `export default require_x()`, which makes the ESM default import resolve
 * to the entire CJS exports object (e.g. `{ default: Component, ... }`)
 * instead of the actual component / function.
 *
 * Symptoms of the bug this works around:
 *   - "X is not a function"
 *   - "Element type is invalid: expected a string ... but got: object"
 *
 * Usage:
 *   import RawFoo from 'cjs-package';
 *   const Foo = unwrapCjsDefault<typeof RawFoo>(RawFoo);
 *
 * The result is the original value if it is already a function/class, or
 * the `.default` property if it was an ESM-wrapped CJS module object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unwrapCjsDefault<T = any>(mod: any): T {
    if (typeof mod === 'function') return mod as T;
    if (mod && typeof mod === 'object' && 'default' in mod) {
        return mod.default as T;
    }
    return mod as T;
}

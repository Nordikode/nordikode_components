import type * as Declared from '../../floor-plan'
import type * as Source from './index'

/**
 * Keeps `floor-plan.d.ts` honest (SIGN-2041). The declaration file is
 * written by hand, as the package's other entries are, and it is where the
 * apps get their types from — but nothing reads it when this package is
 * built. With some three hundred exports that the apps call directly, a
 * signature that drifts would send a wrong type to every app without a
 * sound.
 *
 * So the type check compares the two, in both directions: every value
 * `src/floor-plan/index.ts` exports must be declared with the same type, and
 * nothing may be declared that is not exported. The error names the export
 * that differs. Types and interfaces are compared through the signatures
 * that use them.
 *
 * Nothing imports this file, so it is never part of the build.
 */
declare const source: typeof Source
declare const declared: typeof Declared

export const declaredMatchesSource: typeof Declared = source
export const sourceMatchesDeclared: typeof Source = declared

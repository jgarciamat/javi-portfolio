/**
 * Type-level contract check. `contract<T>()(fixture)` compiles only when the fixture (a real
 * answer of the API, `as const`) fits the type the app declares for it (a field the API
 * dropped or changed) and has no field the type ignores (a field the API added or renamed).
 * The error names the paths of the extra fields. A field typed `unknown` is not looked into.
 */
type DeepMutable<F> = F extends readonly unknown[]
  ? DeepMutable<F[number]>[]
  : F extends object
  ? { -readonly [K in keyof F]: DeepMutable<F[K]> }
  : F;

type AllKeys<T> = T extends unknown ? keyof T : never;
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type Key = string | number;

/** A key the type declares (a number-keyed record takes the numeric strings JSON turns them into). */
type Declared<K, T> = K extends AllKeys<T>
  ? true
  : K extends `${number}`
  ? number extends AllKeys<T>
    ? true
    : false
  : false;

type ValueOf<T, K extends PropertyKey> = T extends unknown
  ? K extends keyof T
    ? T[K]
    : K extends `${number}`
    ? T[keyof T & number]
    : never
  : never;

/** Paths of the fields of the fixture that the type does not declare. */
type ExtraPaths<F, T, P extends string = ''> = unknown extends T
  ? never
  : F extends readonly unknown[]
  ? ExtraPaths<F[number], ElementOf<NonNullable<T>>, `${P}[]`>
  : F extends object
  ? {
      [K in keyof F & Key]: Declared<K, NonNullable<T>> extends true
        ? ExtraPaths<F[K], ValueOf<NonNullable<T>, K>, `${P}.${K}`>
        : `${P}.${K}`;
    }[keyof F & Key]
  : never;

type Guard<F, T> = [DeepMutable<F>] extends [T]
  ? [ExtraPaths<DeepMutable<F>, T>] extends [never]
    ? unknown
    : { extraFieldsTheTypeDoesNotDeclare: ExtraPaths<DeepMutable<F>, T> }
  : { theAnswerDoesNotFitTheType: true };

export function contract<T>() {
  return <F>(fixture: F & Guard<F, T>): F => fixture;
}

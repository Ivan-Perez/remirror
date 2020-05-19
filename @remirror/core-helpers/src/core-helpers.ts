import deepmerge from 'deepmerge';
import fastDeepEqual from 'fast-deep-equal';
import { nanoid } from 'nanoid';
import omit from 'object.omit';
import pick from 'object.pick';
import { Primitive } from 'type-fest';

import { REMIRROR_IDENTIFIER_KEY, RemirrorIdentifier } from '@remirror/core-constants';
import { Nullable, Predicate, RemirrorIdentifierShape } from '@remirror/core-types';

type AnyConstructor<GType = unknown> = new (...args: any[]) => GType;
type AnyFunction<GType = any> = (...args: any[]) => GType;
interface PlainObject<Type = unknown> {
  [key: string]: Type;
}

/**
 * Any falsy type.
 */
type Falsy = false | 0 | '' | null | undefined;

/**
 * Type cast an argument. If no type is provided it will default to any.
 *
 * @param arg - the arg to typecast
 */
export const Cast = <GType = any>(argument: any): GType => argument;

/**
 * A typesafe implementation of `Object.entries()`
 *
 * Taken from
 * https://github.com/biggyspender/ts-entries/blob/master/src/ts-entries.ts
 */
export const entries = <
  GType extends object,
  GKey extends Extract<keyof GType, string>,
  GValue extends GType[GKey],
  GEntry extends [GKey, GValue]
>(
  object_: GType,
): GEntry[] => Object.entries(object_) as GEntry[];

/**
 * A typesafe implementation of `Object.keys()`
 */
export const keys = <GType extends object, GKey extends Extract<keyof GType, string>>(
  object_: GType,
): GKey[] => Object.keys(object_) as GKey[];

/**
 * A typesafe implementation of `Object.values()`
 */
export const values = <
  GType extends object,
  GKey extends Extract<keyof GType, string>,
  GValue extends GType[GKey]
>(
  object_: GType,
): GValue[] => Object.values(object_) as GValue[];

/**
 * A more lenient typed version of `Array.prototype.includes` which allow less
 * specific types to be checked.
 */
export const includes = <GType>(
  array: GType[] | readonly GType[],
  item: unknown,
  fromIndex?: number,
): item is GType => array.includes(item as GType, fromIndex);

/**
 * Creates an object with the null prototype.
 *
 * @param value - the object to create
 */
export const object = <Type extends object>(value?: Type): Type => {
  return Object.assign(Object.create(null), value);
};

/**
 * Shorthand for casting a value to it's boolean equivalent.
 *
 * @param value - the value to transform into a boolean
 *
 * @public
 */
export const bool = <GValue>(value: GValue): value is Exclude<GValue, Falsy> => !!value;

/**
 * A type name matcher for object types.
 *
 * @private
 */
enum TypeName {
  Object = 'Object',
  RegExp = 'RegExp',
  Date = 'Date',
  Promise = 'Promise',
  Error = 'Error',
  Map = 'Map',
  Set = 'Set',
}

/**
 * Alias of toString for non-dom environments.
 *
 * This is a safe way of calling `toString` on objects created with
 * `Object.create(null)`.
 */
export const toString = (value: unknown) => Object.prototype.toString.call(value);

/**
 * Negates a predicate check.
 *
 * @remarks
 *
 * Unfortunately I'm not sure if it's possible to actually negate the predicate
 * with typescript automatically.
 */
export const not = <GType>(predicate: Predicate<GType>) => (a: unknown) => !predicate(a);

/**
 * Retrieve the object type of a value via it's string reference. This is safer
 * than relying on instanceof checks which fail on cross-frame values.
 *
 * @param value - the object to inspect
 */
const getObjectType = (value: unknown): TypeName | undefined => {
  const objectName = toString(value).slice(8, -1);

  return objectName as TypeName;
};

/**
 * A helper for building type predicates
 *
 * @param type -  the name of the type to check for
 * @returns a predicate function for checking the value type
 */
const isOfType = <GType>(type: string, test?: (value: GType) => boolean) => (
  value: unknown,
): value is GType => {
  if (typeof value !== type) {
    return false;
  }

  return test ? test(value as GType) : true;
};
/**
 * Get the object type of passed in value. This avoids the reliance on
 * `instanceof` checks which are subject to cross frame issues as outlined in
 * this link https://bit.ly/1Qds27W
 *
 * @param type - the name of the object type to check for
 *
 * @private
 */
const isObjectOfType = <GType>(type: TypeName) => (value: unknown): value is GType =>
  getObjectType(value) === type;

/**
 * Check if an instance is the direct instance of the provided class.
 */
export const isDirectInstanceOf = <T>(
  instance: unknown,
  Constructor: AnyConstructor<T>,
): instance is T => Object.getPrototypeOf(instance) === Constructor.prototype;

/**
 * Predicate check that value is undefined
 *
 * @param value - the value to check
 *
 * @public
 */
export const isUndefined = isOfType<undefined>('undefined');

/**
 * Predicate check that value is a string
 *
 * @param value - the value to check
 *
 * @public
 */
export const isString = isOfType<string>('string');

/**
 * Predicate check that value is a number.
 *
 * Also by default doesn't include NaN as a valid number.
 *
 * @param value - the value to check
 *
 * @public
 */
export const isNumber = isOfType<number>('number', (value) => !Number.isNaN(value));

/**
 * Predicate check that value is a function
 *
 * @param value - the value to check
 *
 * @public
 */
export const isFunction = isOfType<AnyFunction>('function');

/**
 * Predicate check that value is null
 *
 * @param value - the value to check
 *
 * @public
 */
export const isNull = (value: unknown): value is null => value === null;

/**
 * Predicate check that value is a class
 *
 * @deprecated Due to the current build process stripping out classes
 *
 * @param value - the value to check
 *
 * @public
 */
export const isClass = (value: unknown): value is AnyConstructor =>
  isFunction(value) && value.toString().startsWith('class ');

/**
 * Predicate check that value is boolean
 *
 * @param value - the value to check
 *
 * @public
 */
export const isBoolean = (value: unknown): value is boolean => value === true || value === false;

/**
 * Predicate check that value is a symbol
 *
 * @param value - the value to check
 *
 * @public
 */
export const isSymbol = isOfType<symbol>('symbol');

/**
 * Helper function for Number.isInteger check allowing non numbers to be tested
 *
 * @param value - the value to check
 *
 * @public
 */
export const isInteger = (value: unknown): value is number => Number.isInteger(value as number);

/**
 * Helper function for Number.isSafeInteger allowing for unknown values to be
 * tested
 *
 * @param value - the value to check
 *
 * @public
 */
export const isSafeInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value as number);

/**
 * Predicate check for whether passed in value is a plain object
 *
 * @param value - the value to check
 *
 * @public
 */
export function isPlainObject<Type = unknown>(value: unknown): value is PlainObject<Type> {
  if (getObjectType(value) !== TypeName.Object) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === null || prototype === Object.getPrototypeOf({});
}

/**
 * Predicate check for whether passed in value is a primitive value
 */
export function isPrimitive(value: unknown): value is Primitive {
  return value == null || /^[bns]/.test(typeof value);
}

/**
 * Utility predicate check that value is either null or undefined
 *
 * @param value - the value to check
 *
 * @public
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return isNull(value) || isUndefined(value);
}
/**
 * Predicate check that value is an object.
 *
 * @param value - the value to check
 *
 * @public
 */
export const isObject = <Type extends object>(value: unknown): value is Type =>
  !isNullOrUndefined(value) && (isFunction(value) || isOfType('object')(value));

/**
 * A shorthand method for creating instance of checks.
 */
export const isInstanceOf = <GConstructor extends AnyConstructor>(Constructor: GConstructor) => (
  value: unknown,
): value is InstanceType<GConstructor> => isObject(value) && value instanceof Constructor;

/**
 * Predicate check that value is a native promise
 *
 * @param value - the value to check
 *
 * @public
 */
export const isNativePromise = (value: unknown): value is Promise<unknown> =>
  isObjectOfType<Promise<unknown>>(TypeName.Promise)(value);

/**
 * Check to see if a value has the built in promise API.
 *
 * @param value - the value to check
 *
 * @public
 */
const hasPromiseAPI = (value: unknown): value is Promise<unknown> =>
  !isNull(value) &&
  (isObject(value) as unknown) &&
  isFunction((value as Promise<unknown>).then) &&
  isFunction((value as Promise<unknown>).catch);

/**
 * Predicate check that value has the promise api implemented
 *
 * @param value - the value to check
 *
 * @public
 */
export const isPromise = (value: unknown): value is Promise<unknown> =>
  isNativePromise(value) || hasPromiseAPI(value);

/**
 * Predicate check that value is a RegExp
 *
 * @param value - the value to check
 *
 * @public
 */
export const isRegExp = isObjectOfType<RegExp>(TypeName.RegExp);

/**
 * Predicate check that value is a date
 *
 * @param value - the value to check
 *
 * @public
 */
export const isDate = isObjectOfType<Date>(TypeName.Date);

/**
 * Predicate check that value is an error
 *
 * @param value - the value to check
 *
 * @public
 */
export const isError = isObjectOfType<Error>(TypeName.Error);

/**
 * Predicate check that value is a `Map`
 *
 * @param value - the value to check
 *
 * @public
 */
export const isMap = (value: unknown): value is Map<unknown, unknown> =>
  isObjectOfType<Map<unknown, unknown>>(TypeName.Map)(value);

/**
 * Predicate check that value is a `Set`
 *
 * @param value - the value to check
 *
 * @public
 */
export const isSet = (value: unknown): value is Set<unknown> =>
  isObjectOfType<Set<unknown>>(TypeName.Set)(value);

/**
 * Predicate check that value is an empty object
 *
 * @param value - the value to check
 *
 * @public
 */
export const isEmptyObject = (value: unknown): value is { [key: string]: never } =>
  isObject(value) && !isMap(value) && !isSet(value) && Object.keys(value).length === 0;

/**
 * Alias the isArray method.
 */
export const isArray = Array.isArray;

/**
 * Predicate check that value is an empty array
 *
 * @param value - the value to check
 *
 * @public
 */
export const isEmptyArray = (value: unknown): value is never[] =>
  isArray(value) && value.length === 0;

/**
 * Identifies the value as having a remirror identifier. This is the core
 * predicate check for the remirror library.
 *
 * @param value - the value to be checked
 *
 * @internal
 */
export const isRemirrorType = (value: unknown): value is RemirrorIdentifierShape =>
  isObject<RemirrorIdentifierShape>(value);

/**
 * Checks that the provided remirror shape is of a given type.
 *
 * @param value - any remirror shape
 * @param type - the remirror identifier type to check for
 *
 * @internal
 */
export function isIdentifierOfType(
  value: RemirrorIdentifierShape,
  type: RemirrorIdentifier | RemirrorIdentifier[],
) {
  return isArray(type)
    ? includes(type, value[REMIRROR_IDENTIFIER_KEY])
    : type === value[REMIRROR_IDENTIFIER_KEY];
}

/**
 * Capitalizes a string value.
 *
 * @param str - the string to capitalize.
 * @public
 */
export function capitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Removes leading and trailing whitespace from a string.
 *
 * @param str - the string to trim
 *
 * @public
 */
export function trim(string: string) {
  return string.replace(/^ +| +$/g, '');
}

/**
 * Trim and conditionally capitalize string values.
 *
 * @param str - the string to format.
 *
 * @public
 */
export function format(string: string) {
  string = trim(string);
  return /^(?:webOS|i(?:OS|P))/.test(string) ? string : capitalize(string);
}

/**
 * Calls a function if defined and provides compile time type checking for the
 * passed in parameters.
 *
 * @param fn - the function to call if it exists
 * @param args - the rest of the parameters with types
 */
export function callIfDefined<Method extends AnyFunction>(
  fn: Nullable<Method>,
  ...args: Parameters<Method>
) {
  if (isFunction(fn)) {
    fn(...args);
  }
}

/**
 * Finds all the regex matches for a string
 *
 * @param text - the text to check against
 * @param regexp - the regex (which should include a 'g' flag)
 *
 * @public
 */
export function findMatches(text: string, regexp: RegExp) {
  const results: RegExpExecArray[] = [];
  const flags = regexp.flags;
  let match: RegExpExecArray | null;

  if (!flags.includes('g')) {
    regexp = new RegExp(regexp.source, `g${flags}`);
  }

  do {
    match = regexp.exec(text);
    if (match) {
      results.push(match);
    }
  } while (match);

  regexp.lastIndex = 0;
  return results;
}

/**
 * A utility function to clean up the Operating System name.
 *
 * @param os - the OS name to clean up.
 * @param pattern - a `RegExp` pattern matching the OS name.
 * @param label - a label for the OS.
 * @returns a cleaned up Operating System name
 *
 * @public
 */
export function cleanupOS(os: string, pattern?: string, label?: string) {
  if (pattern && label) {
    os = os.replace(new RegExp(pattern, 'i'), label);
  }

  const value = format(
    os
      .replace(/ ce$/i, ' CE')
      .replace(/\bhpw/i, 'web')
      .replace(/\bMacintosh\b/, 'Mac OS')
      .replace(/_powerpc\b/i, ' OS')
      .replace(/\b(os x) [^\d ]+/i, '$1')
      .replace(/\bMac (OS X)\b/, '$1')
      .replace(/\/(\d)/, ' $1')
      .replace(/_/g, '.')
      .replace(/(?: bepc|[ .]*fc[\d .]+)$/i, '')
      .replace(/\bx86\.64\b/gi, 'x86_64')
      .replace(/\b(Windows Phone) OS\b/, '$1')
      .replace(/\b(Chrome OS \w+) [\d.]+\b/, '$1')
      .split(' on ')[0],
  );

  return value;
}

/**
 * A utility function to check whether the current browser is running on the
 * android platform.
 * @public
 */
export function isAndroidOS() {
  const ua = navigator.userAgent;
  const match = new RegExp('\\b' + 'Android' + '(?:/[\\d.]+|[ \\w.]*)', 'i').exec(ua);
  if (!match) {
    return false;
  }
  return cleanupOS(match[0], 'Android', 'Android').includes('Android');
}

/**
 * Generate a random float between min and max. If only one parameter is
 * provided minimum is set to 0.
 *
 * @param min - the minimum value
 * @param max - the maximum value
 *
 * @public
 */
export function randomFloat(min: number, max?: number) {
  if (!max) {
    max = min;
    min = 0;
  }

  return Math.random() * (max - min + 1) + min;
}

/**
 * Generate a random integer between min and max. If only one parameter is
 * provided minimum is set to 0.
 *
 * @param min - the minimum value
 * @param max - the maximum value
 *
 * @public
 */
export function randomInt(min: number, max?: number) {
  return Math.floor(randomFloat(min, max));
}

/**
 * Converts a string, including strings in camelCase or snake_case, into Start
 * Case (a variant of Title case where all words start with a capital letter),
 * it keeps original single quote and hyphen in the word.
 *
 *   'management_companies' to 'Management Companies' 'managementCompanies' to
 *   'Management Companies' `hell's kitchen` to `Hell's Kitchen` `co-op` to
 *   `Co-op`
 *
 * @param str - the string to examine
 */
export function startCase(string: string) {
  return string
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, (_, $1: string, $2: string) => `${$1} ${$2}`)
    .replace(/(\s|^)(\w)/g, (_, $1: string, $2: string) => `${$1}${$2.toUpperCase()}`);
}

interface UniqueIdParameter {
  /**
   * The prefix for the unique id
   *
   * @defaultValue ''
   */
  prefix?: string;

  /**
   * The length of the generated ID for the unique id
   *
   * @defaultValue 21
   */
  size?: number;
}

/**
 * Generate a unique id
 *
 * @param params - the destructured params
 * @returns a unique string of specified length
 *
 * @public
 */
export function uniqueId({ prefix = '', size }: UniqueIdParameter = { prefix: '' }) {
  return `${prefix}${nanoid(size)}`;
}

/**
 * Takes a number of elements from the provided array starting from the
 * zero-index
 *
 * @param arr - the array to take from
 * @param num - the number of items to take
 *
 * @public
 */
export function take<GArray extends any[]>(array: GArray, number: number) {
  number = Math.max(Math.min(0, number), number);
  return array.slice(0, number);
}

export function omitUndefined(object: PlainObject) {
  return omit(object, (value) => !isUndefined(value));
}

/**
 * Clones a plain object using object spread notation
 *
 * @param value - the value to check
 *
 * @public
 */
export function clone<Type extends object>(value: Type): Type {
  if (!isPlainObject(value)) {
    throw new Error('An invalid value was passed into this clone utility. Expected a plain object');
  }

  return { ...value };
}

/**
 * Shallow clone an object while preserving it's getters and setters. This is a
 * an alternative to the spread clone.
 */
export function shallowClone<Type extends object>(value: Type): Type {
  const clone = Object.create(Object.getPrototypeOf(value));
  const descriptors = Object.getOwnPropertyDescriptors(value);
  Object.defineProperties(clone, descriptors);

  return clone;
}

/**
 * Alias for fast deep equal
 */
export const isEqual = fastDeepEqual;

/**
 * Create a unique array in a non-mutating manner
 *
 * @param array - the array which will be reduced to its unique elements
 * @param fromStart - when set to true the duplicates will be removed from the
 * beginning of the array. This defaults to false.
 * @return a new array containing only unique elements (by reference)
 *
 * @public
 */
export const uniqueArray = <GType>(array: GType[], fromStart = false) => {
  const array_ = fromStart ? [...array].reverse() : array;
  const set = new Set(array_);
  return fromStart ? [...set].reverse() : [...set];
};

/**
 * Flattens an array
 *
 * @param array
 *
 * @public
 */
export const flattenArray = <GType>(array: any[]): GType[] =>
  array.reduce((a, b) => a.concat(Array.isArray(b) ? flattenArray(b) : b), []);

/**
 * Sometimes doing nothing is the best policy.
 */
export const noop = () => {};

/**
 * Use this to completely overwrite an object when merging.
 *
 * ```ts
 * const source = { awesome: { a: 'a' } }
 * const target = { awesome: { b: 'b' } }
 * const result = deepMerge(source, target) // => { awesome: { a: 'a', b: 'b' } }
 *
 * const overwriteTarget = { awesome: Merge.overwrite({ b: 'b' }) }
 * const overwriteResult = deepMerge(source, overwriteTarget) // => { awesome: { b: 'b' } }
 * ```
 *
 */
export class Merge {
  /**
   * This can be used to mimic any object shape.
   */
  [key: string]: unknown;

  /**
   * Create an object that will completely replace the key when merging.
   *
   * @param [obj] - the object to replace the key with. When blank an empty
   * object is used.
   */
  public static overwrite<GReturn = any>(object_: PlainObject = object()): GReturn {
    return new Merge(object_) as any;
  }

  /**
   * Sets the key to undefined thus fully deleting the key.
   */
  public static delete() {
    return undefined as any;
  }

  private constructor(object_: PlainObject = object()) {
    keys(object_).forEach((key) => {
      this[key] = object_[key];
    });
  }
}

/**
 * A deep merge which only merges plain objects and Arrays. It clones the object
 * before the merge so will not mutate any of the passed in values.
 *
 * To completely remove a key you can use the `Merge` helper class which
 * replaces it's key with a completely new object
 */
export const deepMerge = <GType = any>(...objects: Array<PlainObject | unknown[]>): GType => {
  return deepmerge.all<GType>(objects as any, { isMergeableObject: isPlainObject });
};

interface ClampParameter {
  min: number;
  max: number;
  value: number;
}

/**
 * Clamps the value to the provided range.
 */
export const clamp = ({ min, max, value }: ClampParameter): number => {
  if (value < min) {
    return min;
  }

  return value > max ? max : value;
};

/**
 * Get the last element of the array.
 */
export const last = <GType>(array: GType[]) => array[array.length - 1];

/**
 * Sorts an array while retaining the original order when the compare method
 * identifies the items as equal.
 *
 * `Array.prototype.sort()` is unstable and so values that are the same will
 * jump around in a non deterministic manner. Here I'm using the index as a
 * fallback. If two elements have the same priority the element with the lower
 * index is placed first hence retaining the original order.
 *
 * @param array - the array to sort
 * @param compareFn - compare the two value arguments `a` and `b` - return 0 for
 *                  equal - return number > 0 for a > b - return number < 0 for
 *                  b > a
 */
export const sort = <GType>(array: GType[], compareFn: (a: GType, b: GType) => number) => {
  return [...array]
    .map((value, index) => ({ value, index }))
    .sort((a, b) => compareFn(a.value, b.value) || a.index - b.index)
    .map(({ value }) => value);
};

/**
 * Get a property from an object or array by a string path or an array path.
 *
 * @param path - path to property
 * @param obj - object to retrieve property from
 */
export const get = <GReturn = any>(
  path: string | Array<string | number>,
  object_: any,
  fallback?: any,
): GReturn => {
  if (!path || isEmptyArray(path)) {
    return isUndefined(object_) ? fallback : object_;
  }

  if (isString(path)) {
    path = path.split('.');
  }

  for (let ii = 0, length_ = path.length; ii < length_ && object_; ++ii) {
    if (!isPlainObject(object_) && !isArray(object_)) {
      return fallback;
    }

    object_ = (object_ as any)[path[ii]];
  }

  return isUndefined(object_) ? fallback : object_;
};

const makeFunctionForUniqueBy = <GItem = any, GKey = any>(
  value: string | Array<string | number>,
) => (item: GItem) => get<GKey>(value, item);

/**
 * Create a unique array of objects from a getter function or a property list.
 *
 * @param array - the array to extract unique values from
 * @param getValue - a getter function or a string with the path to the item
 * that is being used as a a test for uniqueness.
 * @param fromStart - when true will remove duplicates from the start rather
 * than from the end
 *
 * ```ts
 * import { uniqueBy } from '@remirror/core-helpers';
 *
 * const values = uniqueBy([{ id: 'a', value: 'Awesome' }, { id: 'a', value: 'ignored' }], item => item.id);
 * log(values) // => [{id: 'a', value: 'Awesome'}]
 *
 * const byKey = uniqueBy([{ id: 'a', value: 'Awesome' }, { id: 'a', value: 'ignored' }], 'id')
 * // Same as above
 * ```
 */
export const uniqueBy = <GItem = any, GKey = any>(
  array: GItem[],
  getValue: ((item: GItem) => GKey) | string | Array<string | number>,
  fromStart = false,
): GItem[] => {
  const unique: GItem[] = [];
  const found: Set<GKey> = new Set();

  const getter = isFunction(getValue) ? getValue : makeFunctionForUniqueBy(getValue);
  const array_ = fromStart ? [...array].reverse() : array;

  for (const item of array_) {
    const value = getter(item);
    if (!found.has(value)) {
      found.add(value);
      unique.push(item);
    }
  }

  return fromStart ? unique.reverse() : unique;
};

/**
 * Create a range from start to end.
 *
 * If only start is provided it creates an array of the size provided. if start
 * and end are provided it creates an array who's first position is start and
 * final position is end. i.e. `length = (end - start) + 1`
 */
export const range = (start: number, end?: number) => {
  if (!isNumber(end)) {
    return Array.from({ length: Math.abs(start) }, (_, index) => (start < 0 ? -1 : 1) * index);
  }

  if (start <= end) {
    return Array.from({ length: end + 1 - start }, (_, index) => index + start);
  }

  return Array.from({ length: start + 1 - end }, (_, index) => -1 * index + start);
};

/**
 * Check that a number is within the minimum and maximum bounds of a set of
 * numbers.
 *
 * @param value - the number to test
 */
export const within = (value: number, ...rest: Array<number | undefined | null>) => {
  const numbers: number[] = rest.filter<number>(isNumber);
  return value >= Math.min(...numbers) && value <= Math.max(...numbers);
};

/**
 * Safe implementation of hasOwnProperty with typechecking.
 *
 * @remarks
 *
 * See {@link https://eslint.org/docs/rules/no-prototype-builtins}
 *
 * @param obj - the object to check
 * @param key - the property to check
 *
 * @typeParam GObj - the object type
 * @typeParam GProperty - the property which can be a string | number | symbol
 */
export const hasOwnProperty = <GObj extends object, GProperty extends string | number | symbol>(
  object_: GObj,
  key: GProperty,
): object_ is GProperty extends keyof GObj ? GObj : GObj & { GKey: unknown } => {
  return Object.prototype.hasOwnProperty.call(object_, key);
};

// Forwarded exports

export * from 'case-anything';
export { debounce, throttle } from 'throttle-debounce';
export { omit, pick };

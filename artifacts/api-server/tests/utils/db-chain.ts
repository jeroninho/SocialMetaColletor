/**
 * Drizzle-style query chain helpers used by integration tests.
 *
 * The real `drizzle-orm` query builder returns a thenable chain whose terminal
 * methods (`limit`, `offset`, `returning`) resolve to row arrays. These helpers
 * mimic that surface area so route handlers can be exercised end-to-end against
 * an in-memory store without a live Postgres.
 */

import type { Mock } from "vitest";

export type Row = Record<string, unknown>;

export interface SelectChain<T = Row> {
  from: (..._a: unknown[]) => SelectChain<T>;
  where: (..._a: unknown[]) => SelectChain<T>;
  orderBy: (..._a: unknown[]) => SelectChain<T>;
  innerJoin: (..._a: unknown[]) => SelectChain<T>;
  leftJoin: (..._a: unknown[]) => SelectChain<T>;
  groupBy: (..._a: unknown[]) => SelectChain<T>;
  limit: (..._a: unknown[]) => SelectChain<T>;
  offset: (..._a: unknown[]) => SelectChain<T>;
  then: <R1 = T[], R2 = never>(
    onfulfilled?: ((value: T[]) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ) => Promise<R1 | R2>;
}

/**
 * Build an awaitable chain that always resolves to `rows`. All chain methods
 * return the same chain so callers can mix any combination of
 * `from/where/orderBy/limit/offset` and then `await` it directly.
 */
export function chainOf<T extends Row = Row>(rows: T[]): SelectChain<T> {
  const promise = Promise.resolve(rows);
  const chain: SelectChain<T> = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    groupBy: () => chain,
    limit: () => chain,
    offset: () => chain,
    then: (onfulfilled, onrejected) => promise.then(onfulfilled, onrejected),
  };
  return chain;
}

export interface InsertChain<T = Row> {
  values: (rows: T | T[]) => InsertResult<T>;
}

export interface InsertResult<T = Row> extends PromiseLike<undefined> {
  returning: (..._a: unknown[]) => Promise<T[]>;
  onConflictDoNothing: () => InsertResult<T>;
  onConflictDoUpdate: (..._a: unknown[]) => InsertResult<T>;
}

export function insertChain<T extends Row = Row>(
  onValues: (rows: T[]) => T[] | void,
): InsertChain<T> {
  return {
    values: (rows) => {
      const arr = Array.isArray(rows) ? rows : [rows];
      const stored = onValues(arr) ?? arr;
      const promise = Promise.resolve(undefined);
      const result: InsertResult<T> = {
        then: (onfulfilled, onrejected) =>
          promise.then(onfulfilled as never, onrejected as never),
        returning: () => Promise.resolve(stored),
        onConflictDoNothing: () => result,
        onConflictDoUpdate: () => result,
      };
      return result;
    },
  };
}

export interface UpdateChain<T = Row> {
  set: (..._a: unknown[]) => {
    where: (..._a: unknown[]) => Promise<T[]>;
  };
}

export function updateChain<T extends Row = Row>(rows: T[] = []): UpdateChain<T> {
  return {
    set: () => ({ where: () => Promise.resolve(rows) }),
  };
}

export interface DeleteChain {
  where: (..._a: unknown[]) => Promise<undefined>;
}

export function deleteChain(onDelete?: () => void): DeleteChain {
  return {
    where: async () => {
      onDelete?.();
      return undefined;
    },
  };
}

export interface FakeDbHandlers {
  select?: Mock;
  insert?: Mock;
  update?: Mock;
  delete?: Mock;
}

/** A minimal db facade with each operation backed by a vi.fn() */
export type FakeDb = {
  select: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
};

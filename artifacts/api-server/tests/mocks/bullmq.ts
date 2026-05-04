// In-memory BullMQ stand-in: emulates the surface used by metadataSyncQueue.ts
// (Queue.add, Worker constructor, Job lifecycle, retry-on-failure).
import { vi } from "vitest";

export interface FakeJob<TData = unknown, TResult = unknown> {
  id: string;
  name: string;
  data: TData;
  attemptsMade: number;
  result?: TResult;
  failedReason?: string;
  updateProgress: (n: number) => Promise<void>;
}

export interface FakeQueueState<TData = unknown, TResult = unknown> {
  added: FakeJob<TData, TResult>[];
  workers: Array<(job: FakeJob<TData, TResult>) => Promise<TResult>>;
  attempts: number;
}

export function installBullmqMock<TData = unknown, TResult = unknown>(): {
  state: FakeQueueState<TData, TResult>;
  drain: (maxAttempts?: number) => Promise<void>;
  restore: () => void;
} {
  const state: FakeQueueState<TData, TResult> = {
    added: [],
    workers: [],
    attempts: 3,
  };

  let nextId = 1;

  vi.doMock("bullmq", () => ({
    Queue: vi.fn(function FakeQueue() {
      return {
        add: vi.fn(async (name: string, data: TData) => {
          const job: FakeJob<TData, TResult> = {
            id: String(nextId++),
            name,
            data,
            attemptsMade: 0,
            updateProgress: vi.fn(async () => {}),
          };
          state.added.push(job);
          return job;
        }),
        close: vi.fn(async () => {}),
      };
    }),
    Worker: vi.fn(function FakeWorker(
      _name: string,
      processor: (job: FakeJob<TData, TResult>) => Promise<TResult>,
    ) {
      state.workers.push(processor);
      return {
        on: vi.fn(),
        close: vi.fn(async () => {}),
      };
    }),
  }));

  async function drain(maxAttempts = 3): Promise<void> {
    state.attempts = maxAttempts;
    for (const job of state.added) {
      const processor = state.workers[0];
      if (!processor) continue;
      let lastErr: unknown = null;
      for (let i = 0; i < maxAttempts; i++) {
        job.attemptsMade = i + 1;
        try {
          job.result = await processor(job);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
        }
      }
      if (lastErr) {
        job.failedReason = (lastErr as Error).message;
      }
    }
  }

  return {
    state,
    drain,
    restore: () => vi.doUnmock("bullmq"),
  };
}

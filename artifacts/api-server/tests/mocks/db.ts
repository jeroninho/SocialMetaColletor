/**
 * Helpers for building a fake `@workspace/db` module per test. Tests invoke
 * `vi.mock("@workspace/db", ...)` themselves so the mock factory closes over
 * test-scoped state, but they can use these chain helpers to compose handlers.
 */
export {
  chainOf,
  insertChain,
  updateChain,
  deleteChain,
  type FakeDb,
  type Row,
} from "../utils/db-chain.js";

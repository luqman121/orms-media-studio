// Backward-compat shim: the durable RunEvent writer now lives in
// `@orms/generation-runtime` so the BullMQ worker (a separate package that cannot
// import apps/web/lib/*) shares ONE implementation. Existing call sites in apps/web
// keep importing from '@/lib/run-events' unchanged.
export * from '@orms/generation-runtime';
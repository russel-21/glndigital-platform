// Verified real per-unit rates for the client cost-quote/reconciliation
// mechanism (see get-action-quote/index.ts and _shared/quoteReconciliation.ts).
// Shared in one place so get-action-quote (the estimate) and each phase
// function (the post-execution reconciliation) can never drift apart.
//
// Claude Sonnet 5: verified 2026-08-31 via the claude-api skill's pricing
// table. RunPod RTX 4090 serverless: verified live the same day via the
// RunPod MCP (list-gpu-types, SERVERLESS product, secure cloud rate).
export const CLAUDE_INPUT_USD_PER_MILLION = 2.0;
export const CLAUDE_OUTPUT_USD_PER_MILLION = 10.0;
export const RUNPOD_USD_PER_GPU_HOUR = 1.1;

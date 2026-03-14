import { client, walletClient } from "./elsaClient";
import dotenv from "dotenv";

dotenv.config();

async function executeSwap() {
  const swap = await client.post("/api/execute_swap", {
    from_chain: "base",
    from_token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    from_amount: "100",
    to_chain: "base",
    to_token: "0x4200000000000000000000000000000000000006",
    wallet_address: process.env.WALLET_ADDRESS,
    slippage: 2.0,
    dry_run: false,
  });

  const pipelineId = swap.data.result.pipeline_id;

  console.log("Pipeline:", pipelineId);

  const status = await client.post("/api/get_transaction_status", {
    pipeline_id: pipelineId,
  });

  const task = status.data.tasks?.[0];

  if (task?.status === "sign_pending") {
    const hash = await walletClient.sendTransaction(task.tx_data);

    await client.post("/api/submit_transaction_hash", {
      task_id: task.task_id,
      tx_hash: hash,
      status: "submitted",
    });

    console.log("Transaction submitted:", hash);
  }
}

executeSwap();
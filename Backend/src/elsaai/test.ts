import { client } from "./elsaClient";
import dotenv from "dotenv";
dotenv.config();


async function getBalances() {
  const url = "https://x402-api.heyelsa.ai/api/get_balances";

  const paymentToken:any = process.env.PAYMENT_TOKEN; // X402 payment token
  const walletAddress = process.env.WALLET_ADDRESS;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PAYMENT": paymentToken
      },
      body: JSON.stringify({
        evm_address: walletAddress
      })
    });

    const data = await response.json();

    console.log("Balances:", JSON.stringify(data,null,2));
  } catch (error) {
    console.error("Error:", error);
  }
}

getBalances();
import { client } from "./elsaClient";
import dotenv from "dotenv";

dotenv.config();

async function getPortfolio() {
  try {
    const response = await client.post("/api/get_portfolio", {
      wallet_address: process.env.WALLET_ADDRESS,
    });

    console.log("Portfolio:", response.data);
  } catch (error) {
    console.error(error);
  }
}

getPortfolio();
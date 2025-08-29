// deepseek-node.js
const axios = require("axios");
require("dotenv").config();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE || "https://api.deepseek.com/v1";
const MODEL = process.env.MODEL || "deepseek-r1-0528";

async function deepseekChat(messages, max_tokens = 512, temperature = 0.7) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("❌ DEEPSEEK_API_KEY manquant dans .env");
  }

  try {
    const { data } = await axios.post(
      `${DEEPSEEK_BASE}/chat/completions`,
      {
        model: MODEL,
        messages,
        max_tokens,
        temperature,
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // retourne seulement le texte
    return data.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("Erreur DeepSeek:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = { deepseekChat };

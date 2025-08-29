require("dotenv").config();
const Groq = require("groq-sdk");
const readline = require("readline");

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Check if the API key is available
if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not set in the .env file");
}

// Initialize the Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ---------- Configuration ----------

// Default sampling parameters - can be overridden by environment variables
const DEFAULT_CONFIG = {
  temperature: 0.9,
  topP: 0.9,
  topK: 40,
  maxTokens: 1200,
  model: "llama3-8b-8192",
  stop: ["\nHuman:", "\nAI:"], // 👈 default stop sequences
};

// Load configuration from environment variables with fallbacks
function loadConfig() {
  return {
    temperature:
      parseFloat(process.env.LLM_TEMPERATURE) || DEFAULT_CONFIG.temperature,
    topP: parseFloat(process.env.LLM_TOP_P) || DEFAULT_CONFIG.topP,
    topK: parseInt(process.env.LLM_TOP_K) || DEFAULT_CONFIG.topK,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || DEFAULT_CONFIG.maxTokens,
    model: process.env.LLM_MODEL || DEFAULT_CONFIG.model,
    stop: process.env.LLM_STOP
      ? process.env.LLM_STOP.split(",").map((s) => s.trim())
      : DEFAULT_CONFIG.stop,
  };
}

let currentConfig = loadConfig();

// ---------- Utils ----------

function validatePrompt(prompt) {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt cannot be empty");
  }
  if (prompt.length > 2000) {
    throw new Error("Prompt is too long (max 2000 characters)");
  }
  return prompt.trim();
}

function validateTopP(value) {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0 || num > 1) {
    throw new Error(
      "Top P must be a number between 0 (exclusive) and 1 (inclusive)"
    );
  }
  return num;
}

function validateTopK(value) {
  const num = parseInt(value);
  if (isNaN(num) || num < 1 || num > 1000) {
    throw new Error("Top-K must be an integer between 1 and 1000");
  }
  return num;
}

function validateTemperature(value) {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > 2) {
    throw new Error("Temperature must be a number between 0 and 2");
  }
  return num;
}

function validateStop(value) {
  if (!value || value.trim().length === 0) {
    throw new Error("Stop sequence cannot be empty");
  }
  return value.split(",").map((s) => s.trim());
}

function isCreativeRequest(text) {
  return /\b(story|short story|narrative|fiction|tale|fable|bedtime|poem|poetry|novella|scene|screenplay|creative writing|write.*story)\b/i.test(
    text
  );
}

function wantsStructuredOutput(text) {
  return (
    /^\/json\b/i.test(text) ||
    /as\s+json\b/i.test(text) ||
    /structured\s+output/i.test(text)
  );
}

function isConfigCommand(text) {
  return /^\/config\b/i.test(text) || /^\/set\b/i.test(text);
}

function parseConfigCommand(text) {
  const parts = text.trim().split(/\s+/);

  if (
    parts.length === 2 &&
    (parts[1].toLowerCase() === "show" || parts[1].toLowerCase() === "status")
  ) {
    return { action: "show" };
  }

  if (parts.length >= 3) {
    const param = parts[1].toLowerCase();
    const value = parts.slice(2).join(" ");

    if (param === "top_p" || param === "topp") {
      return { action: "set", param: "topP", value: validateTopP(value) };
    } else if (param === "top_k" || param === "topk") {
      return { action: "set", param: "topK", value: validateTopK(value) };
    } else if (param === "temperature" || param === "temp") {
      return {
        action: "set",
        param: "temperature",
        value: validateTemperature(value),
      };
    } else if (param === "max_tokens" || param === "tokens") {
      const tokens = parseInt(value);
      if (isNaN(tokens) || tokens < 1 || tokens > 4096) {
        throw new Error("Max tokens must be between 1 and 4096");
      }
      return { action: "set", param: "maxTokens", value: tokens };
    } else if (param === "stop") {
      return { action: "set", param: "stop", value: validateStop(value) };
    }
  }

  throw new Error(
    "Invalid config command. Use: /config show, /config top_p <val>, /config top_k <val>, /config temperature <val>, /config max_tokens <val>, /config stop <comma-separated values>"
  );
}

// ---------- Adaptive Config ----------
function getAdaptiveConfig(userPrompt, baseConfig) {
  const creative = isCreativeRequest(userPrompt);
  const structured = wantsStructuredOutput(userPrompt);

  const adaptiveConfig = { ...baseConfig };

  if (structured) {
    adaptiveConfig.temperature = Math.min(baseConfig.temperature, 0.3);
    adaptiveConfig.topP = Math.min(baseConfig.topP, 0.8);
    adaptiveConfig.topK = Math.min(baseConfig.topK, 40);
  } else if (creative) {
    adaptiveConfig.temperature = Math.max(baseConfig.temperature, 0.7);
    adaptiveConfig.topP = Math.max(baseConfig.topP, 0.85);
    adaptiveConfig.topK = Math.max(baseConfig.topK, 100);
  }

  return adaptiveConfig;
}

// ---------- Core AI Call ----------
const conversationHistory = [];

async function handleApiRequest(rawPrompt) {
  const startTime = process.hrtime();

  try {
    const structured = wantsStructuredOutput(rawPrompt);
    const cleanPrompt = structured
      ? rawPrompt.replace(/^\/json\b\s*/i, "")
      : rawPrompt;

    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      ...conversationHistory,
      { role: "user", content: cleanPrompt },
    ];

    const adaptiveConfig = getAdaptiveConfig(cleanPrompt, currentConfig);

    const requestBody = {
      messages,
      model: adaptiveConfig.model,
      temperature: adaptiveConfig.temperature,
      top_p: adaptiveConfig.topP,
      top_k: adaptiveConfig.topK,
      stop: currentConfig.stop, // 👈 Stop sequences included
      max_tokens: adaptiveConfig.maxTokens,
      stream: false,
    };

    if (structured) {
      requestBody.response_format = { type: "json_object" };
    }

    const completion = await groq.chat.completions.create(requestBody);

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";

    conversationHistory.push({ role: "user", content: cleanPrompt });
    conversationHistory.push({ role: "assistant", content: raw });

    return {
      success: true,
      data: raw,
      responseTime,
      tokensUsed: completion.usage?.total_tokens || "N/A",
      samplingParams: {
        temperature: adaptiveConfig.temperature,
        topP: adaptiveConfig.topP,
        topK: adaptiveConfig.topK,
        stop: currentConfig.stop,
        maxTokens: adaptiveConfig.maxTokens,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ---------- Config Handler ----------
function handleConfigCommand(configCmd) {
  try {
    const parsed = parseConfigCommand(configCmd);

    if (parsed.action === "show") {
      console.log("\nCurrent Configuration:");
      console.log(`Temperature: ${currentConfig.temperature}`);
      console.log(`Top P: ${currentConfig.topP}`);
      console.log(`Top K: ${currentConfig.topK}`);
      console.log(`Stop Sequences: ${currentConfig.stop.join(", ")}`);
      console.log(`Max Tokens: ${currentConfig.maxTokens}`);
      console.log(`Model: ${currentConfig.model}`);
      return { success: true };
    }

    if (parsed.action === "set") {
      const oldValue = currentConfig[parsed.param];
      currentConfig[parsed.param] = parsed.value;
      console.log(`\nUpdated ${parsed.param}: ${oldValue} → ${parsed.value}\n`);
      return { success: true };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ---------- CLI ----------
async function run() {
  console.log(
    "Enhanced Assistant with Stop Sequences - Type 'exit' to quit.\n"
  );
  console.log("Commands:");
  console.log("  /json <prompt>        - Get structured JSON output");
  console.log("  /config show          - Display current sampling parameters");
  console.log("  /config top_p 0.8     - Set Top-P (0-1)");
  console.log("  /config top_k 50      - Set Top-K (1-1000)");
  console.log("  /config temp 1.2      - Set temperature (0-2)");
  console.log("  /config tokens 800    - Set max tokens (1-4096)");
  console.log(
    "  /config stop END,###  - Set stop sequences (comma separated)\n"
  );

  let totalRequests = 0;
  let totalResponseTime = 0;

  while (true) {
    const prompt = await new Promise((resolve) =>
      rl.question("You: ", resolve)
    );

    if (prompt.toLowerCase() === "exit") {
      if (totalRequests > 0) {
        console.log("\nSession Statistics:");
        console.log(`Total Requests: ${totalRequests}`);
        console.log(
          `Average Response Time: ${(totalResponseTime / totalRequests).toFixed(
            2
          )}ms`
        );
      }
      rl.close();
      break;
    }

    if (isConfigCommand(prompt)) {
      const result = handleConfigCommand(prompt);
      if (!result.success) console.error("\nConfig Error:", result.error);
      continue;
    }

    try {
      const validatedPrompt = validatePrompt(prompt);
      console.log("\nGenerating response...");
      const result = await handleApiRequest(validatedPrompt);

      if (result.success) {
        console.log(`Assistant:\n${result.data}\n`);
        console.log(`Response Time: ${result.responseTime}ms`);
        console.log(`Tokens Used: ${result.tokensUsed}`);
        console.log(
          `Sampling - Temp: ${result.samplingParams.temperature}, Top-P: ${
            result.samplingParams.topP
          }, Top-K: ${
            result.samplingParams.topK
          }, Stop: ${result.samplingParams.stop.join(" | ")}\n`
        );

        totalRequests++;
        totalResponseTime += parseFloat(result.responseTime);
      } else {
        console.error("\nError:", result.error);
      }
    } catch (err) {
      console.error("\nValidation Error:", err.message);
    }
  }
}

run();

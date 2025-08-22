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
  maxTokens: 1200,
  model: "llama3-8b-8192",
};

// Load configuration from environment variables with fallbacks
function loadConfig() {
  return {
    temperature:
      parseFloat(process.env.LLM_TEMPERATURE) || DEFAULT_CONFIG.temperature,
    topP: parseFloat(process.env.LLM_TOP_P) || DEFAULT_CONFIG.topP,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || DEFAULT_CONFIG.maxTokens,
    model: process.env.LLM_MODEL || DEFAULT_CONFIG.model,
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

function validateTemperature(value) {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > 2) {
    throw new Error("Temperature must be a number between 0 and 2");
  }
  return num;
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
  // Handle commands like:
  // /config top_p 0.8
  // /set temperature 1.2
  // /config show
  const parts = text.trim().split(/\s+/);
  const command = parts[0].toLowerCase();

  if (
    parts.length === 2 &&
    (parts[1].toLowerCase() === "show" || parts[1].toLowerCase() === "status")
  ) {
    return { action: "show" };
  }

  if (parts.length === 3) {
    const param = parts[1].toLowerCase();
    const value = parts[2];

    if (param === "top_p" || param === "topp") {
      return { action: "set", param: "topP", value: validateTopP(value) };
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
    }
  }

  throw new Error(
    "Invalid config command. Use: /config show, /config top_p <value>, /config temperature <value>, /config max_tokens <value>"
  );
}

function stripConfigPrefix(text) {
  return text.replace(/^\/(?:config|set)\b\s*/i, "");
}

function stripStructuredPrefix(text) {
  return text.replace(/^\/json\b\s*/i, "");
}

// Try strict parse; if it fails, attempt to extract the largest JSON block.
function safeParseJSON(maybeJSON) {
  try {
    return JSON.parse(maybeJSON);
  } catch (_) {
    // Extract the first/outermost JSON object using a naive bracket matcher
    const start = maybeJSON.indexOf("{");
    if (start === -1) throw new Error("No JSON object found in response");

    let depth = 0;
    for (let i = start; i < maybeJSON.length; i++) {
      const ch = maybeJSON[i];
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth === 0) {
        const candidate = maybeJSON.slice(start, i + 1);
        return JSON.parse(candidate);
      }
    }
    throw new Error("Malformed JSON in response");
  }
}

// Adjust sampling parameters based on task type
function getAdaptiveConfig(userPrompt, baseConfig) {
  const creative = isCreativeRequest(userPrompt);
  const structured = wantsStructuredOutput(userPrompt);

  // Create a copy of the base config
  const adaptiveConfig = { ...baseConfig };

  if (structured) {
    // For structured output, use lower temperature and top_p for more deterministic results
    adaptiveConfig.temperature = Math.min(baseConfig.temperature, 0.3);
    adaptiveConfig.topP = Math.min(baseConfig.topP, 0.8);
  } else if (creative) {
    // For creative tasks, ensure we have enough randomness
    adaptiveConfig.temperature = Math.max(baseConfig.temperature, 0.7);
    adaptiveConfig.topP = Math.max(baseConfig.topP, 0.85);
  }

  return adaptiveConfig;
}

// ---------- Schemas & Prompt Builders ----------

/**
 * Flexible schema for general QA / extract / summarize.
 * For stories in structured mode, a different schema (storySchema) is used.
 */
const generalSchema = {
  type: "object",
  properties: {
    task: {
      type: "string",
      enum: ["qa", "summarize", "extract", "classify", "unknown", "story"],
    },
    answer: {
      type: "object",
      properties: {
        text: { type: "string" },
      },
      required: ["text"],
      additionalProperties: false,
    },
    key_points: {
      type: "array",
      items: { type: "string" },
    },
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          text: { type: "string" },
        },
        required: ["type", "text"],
        additionalProperties: false,
      },
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    citations: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["task", "answer"],
  additionalProperties: false,
};

const storySchema = {
  type: "object",
  properties: {
    task: { type: "string", enum: ["story"] },
    title: { type: "string" },
    genre: { type: "string" },
    themes: { type: "array", items: { type: "string" } },
    synopsis: { type: "string" },
    word_count: { type: "number" },
    story: { type: "string" },
  },
  required: [
    "task",
    "title",
    "genre",
    "themes",
    "synopsis",
    "word_count",
    "story",
  ],
  additionalProperties: false,
};

/**
 * Build task-aware prompts:
 * - Creative (text mode): final story only (no meta).
 * - Creative (structured mode): JSON with storySchema.
 * - Non-creative (text mode): concise answer (no chain-of-thought).
 * - Non-creative (structured mode): JSON with generalSchema.
 */
function constructPrompt(userPrompt, structured) {
  const creative = isCreativeRequest(userPrompt);
  if (structured && creative) {
    const system =
      "You are an assistant that outputs STRICT JSON only. No prose. " +
      "Validate against the provided JSON Schema. Do not include any keys not present in the schema. " +
      "For text fields, provide concise and coherent content. Do NOT include markdown or code fences.";
    const user =
      `Generate a structured story JSON for the following request: "${userPrompt}".\n\n` +
      `JSON Schema (story_schema):\n` +
      JSON.stringify(storySchema, null, 2) +
      `\n\nRules:\n` +
      `- Output ONLY a JSON object that validates against story_schema.\n` +
      `- story must be 350–600 words, past tense, single POV, show-don't-tell, clear arc.\n` +
      `- No extra commentary. No markdown. No code fences.`;
    return {
      system,
      user,
      schemaName: "story_schema",
      jsonSchema: storySchema,
    };
  }

  if (!structured && creative) {
    const system =
      "You are an award-winning fiction writer. Output ONLY the final narrative text. " +
      "No outlines, no analysis, no bullets, no headings.";
    const user =
      `Write a complete short story based on this request:\n"${userPrompt}"\n\n` +
      "Requirements:\n" +
      "- 350–600 words\n" +
      "- Past tense, single point of view\n" +
      "- Show, don't tell; vivid sensory detail\n" +
      "- Clear arc: setup → conflict → resolution\n" +
      "- No lists, no bullet points, no headings, no step-by-step notes\n" +
      "- Output ONLY the story text";
    return { system, user, schemaName: null, jsonSchema: null };
  }

  if (structured && !creative) {
    const system =
      "You are an assistant that outputs STRICT JSON only. No prose. " +
      "Validate against the provided JSON Schema. Do not include any keys not present in the schema. " +
      "For text fields, be concise and helpful. Do NOT include markdown or code fences.";
    const user =
      `Answer the user's request in structured JSON.\n` +
      `User request: "${userPrompt}"\n\n` +
      `JSON Schema (general_schema):\n` +
      JSON.stringify(generalSchema, null, 2) +
      `\n\nRules:\n` +
      `- Output ONLY a JSON object that validates against general_schema.\n` +
      `- Use task one of: qa, summarize, extract, classify, unknown.\n` +
      `- key_points: concise bullets; entities: key items with type and text; confidence: 0–1.\n` +
      `- No extra commentary. No markdown. No code fences.`;
    return {
      system,
      user,
      schemaName: "general_schema",
      jsonSchema: generalSchema,
    };
  }

  // Non-creative, text mode
  const system =
    "You are a concise, helpful assistant. Provide the answer directly. " +
    "Include only minimal reasoning strictly needed. Do NOT reveal chain-of-thought.";
  const user = userPrompt;
  return { system, user, schemaName: null, jsonSchema: null };
}

// ---------- Core AI Call ----------

const conversationHistory = [];

async function handleApiRequest(rawPrompt) {
  const startTime = process.hrtime();

  try {
    const structured = wantsStructuredOutput(rawPrompt);
    const cleanPrompt = structured
      ? stripStructuredPrefix(rawPrompt)
      : rawPrompt;

    const { system, user, jsonSchema } = constructPrompt(
      cleanPrompt,
      structured
    );

    const messages = [
      { role: "system", content: system },
      ...conversationHistory,
      { role: "user", content: user },
    ];

    // Get adaptive configuration based on the task type
    const adaptiveConfig = getAdaptiveConfig(cleanPrompt, currentConfig);

    // Build request with dynamic sampling parameters
    const requestBody = {
      messages,
      model: adaptiveConfig.model,
      temperature: adaptiveConfig.temperature,
      top_p: adaptiveConfig.topP,
      max_tokens: adaptiveConfig.maxTokens,
      stream: false,
    };

    if (structured) {
      // Some Groq-compatible models accept response_format similar to OpenAI.
      // If unsupported, it will be ignored; we still enforce via prompt + post-parse.
      requestBody.response_format = { type: "json_object" };
    }

    const completion = await groq.chat.completions.create(requestBody);

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";

    let data = raw;
    let structuredOk = false;

    if (structured) {
      // Parse JSON and lightly validate required fields from schema
      const parsed = safeParseJSON(raw);
      // Light validation: check required keys exist
      const required = (jsonSchema && jsonSchema.required) || [];
      const missing = required.filter((k) => !(k in parsed));
      if (missing.length) {
        throw new Error(
          `Structured output missing required keys: ${missing.join(", ")}`
        );
      }
      data = parsed;
      structuredOk = true;
    }

    // Save interaction for context
    conversationHistory.push({ role: "user", content: cleanPrompt });
    conversationHistory.push({
      role: "assistant",
      content: structured ? JSON.stringify(data) : data,
    });

    return {
      success: true,
      structured: structuredOk,
      data,
      responseTime,
      tokensUsed: completion.usage?.total_tokens || "N/A",
      samplingParams: {
        temperature: adaptiveConfig.temperature,
        topP: adaptiveConfig.topP,
        maxTokens: adaptiveConfig.maxTokens,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ---------- Configuration Handler ----------

function handleConfigCommand(configCmd) {
  try {
    const parsed = parseConfigCommand(configCmd);

    if (parsed.action === "show") {
      console.log("\nCurrent Configuration:");
      console.log(`Temperature: ${currentConfig.temperature}`);
      console.log(`Top P: ${currentConfig.topP}`);
      console.log(`Max Tokens: ${currentConfig.maxTokens}`);
      console.log(`Model: ${currentConfig.model}`);
      console.log(
        "\nAdaptive Sampling: Enabled (parameters adjust based on task type)"
      );
      console.log(
        "- Structured tasks: Lower temperature/top_p for deterministic results"
      );
      console.log(
        "- Creative tasks: Higher temperature/top_p for diverse outputs\n"
      );
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

// ---------- CLI Main Loop ----------

async function run() {
  console.log("Enhanced Structured Output Assistant - Type 'exit' to quit.\n");
  console.log("Commands:");
  console.log("  /json <prompt>     - Get structured JSON output");
  console.log("  /config show       - Display current sampling parameters");
  console.log("  /config top_p 0.8  - Set Top P nucleous sampling (0-1)");
  console.log("  /config temp 1.2   - Set temperature (0-2)");
  console.log("  /config tokens 800 - Set max tokens (1-4096)");
  console.log(
    "\nAdaptive Sampling: Parameters auto-adjust based on task type\n"
  );

  let totalRequests = 0;
  let totalResponseTime = 0;

  while (true) {
    const prompt = await new Promise((resolve) => {
      rl.question("You: ", resolve);
    });

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

    // Handle configuration commands
    if (isConfigCommand(prompt)) {
      const result = handleConfigCommand(prompt);
      if (!result.success) {
        console.error("\nConfig Error:", result.error);
      }
      continue;
    }

    try {
      const validatedPrompt = validatePrompt(prompt);

      console.log("\nGenerating response...");
      const result = await handleApiRequest(validatedPrompt);

      if (result.success) {
        if (result.structured) {
          console.log("Assistant (Structured JSON):");
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(`Assistant:\n${result.data}\n`);
        }
        console.log(`Response Time: ${result.responseTime}ms`);
        console.log(`Tokens Used: ${result.tokensUsed}`);
        console.log(
          `Sampling - Temp: ${result.samplingParams.temperature}, Top-P: ${result.samplingParams.topP}\n`
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

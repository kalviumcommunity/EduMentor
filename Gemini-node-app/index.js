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

// Validate prompt
function validatePrompt(prompt) {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt cannot be empty");
  }
  if (prompt.length > 1000) {
    throw new Error("Prompt is too long (max 1000 characters)");
  }
  return prompt.trim();
}

// Store conversation dynamically
const conversationHistory = [];

/**
 * Detect if the user wants creative writing (story/poem/etc.)
 */
function isCreativeRequest(text) {
  return /\b(story|short story|narrative|fiction|tale|fable|bedtime|poem|poetry|novella|scene|screenplay|creative writing|write.*story)\b/i.test(
    text
  );
}

/**
 * Build task-aware prompts:
 * - For creative requests: output ONLY the story (no outlines or analysis).
 * - For other requests: concise answer, minimal steps, no chain-of-thought.
 */
function constructPrompt(userPrompt) {
  if (isCreativeRequest(userPrompt)) {
    return {
      system:
        "You are an award-winning fiction writer. For creative requests, output ONLY the final narrative text. Do not include analysis, outlines, steps, headings, or meta commentary.",
      user:
        `Write a complete short story based on this request:\n"${userPrompt}"\n\n` +
        "Requirements:\n" +
        "- 350–600 words\n" +
        "- Past tense, single point of view\n" +
        "- Show, don't tell; vivid sensory detail\n" +
        "- Clear arc: setup → conflict → resolution\n" +
        "- No lists, no bullet points, no headings, no step-by-step notes\n" +
        "- Output ONLY the story text",
    };
  }

  // Non-creative default: direct, helpful, no chain-of-thought.
  return {
    system:
      "You are a concise, helpful assistant. Provide the answer directly. Include only the minimal reasoning or steps strictly needed. Do NOT reveal chain-of-thought; avoid phrases like 'let's think step by step'.",
    user: userPrompt,
  };
}

// Function to handle API request
async function handleApiRequest(prompt) {
  const startTime = process.hrtime();

  try {
    const { system, user } = constructPrompt(prompt);

    const messages = [
      { role: "system", content: system },
      ...conversationHistory,
      { role: "user", content: user },
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: "llama3-8b-8192",
      temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.9, // remains configurable via .env
      top_p: 0.9,
      max_tokens: 1024,
      stream: false,
    });

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

    const botReply = completion.choices?.[0]?.message?.content?.trim() || "";

    // Save interaction to history for future context
    conversationHistory.push({ role: "user", content: prompt });
    conversationHistory.push({ role: "assistant", content: botReply });

    return {
      success: true,
      data: botReply,
      responseTime,
      tokensUsed: completion.usage?.total_tokens || "N/A",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Main loop
async function run() {
  console.log("Creative & Concise Assistant - Type 'exit' to quit.\n");
  console.log("Ask for a story to get a clean narrative, or any question for a direct answer.\n");

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
          `Average Response Time: ${(totalResponseTime / totalRequests).toFixed(2)}ms`
        );
      }
      rl.close();
      break;
    }

    try {
      const validatedPrompt = validatePrompt(prompt);

      console.log("\nGenerating response...");
      const result = await handleApiRequest(validatedPrompt);

      if (result.success) {
        console.log(`Assistant:\n${result.data}\n`);
        console.log(`Response Time: ${result.responseTime}ms`);
        console.log(`Tokens Used: ${result.tokensUsed}\n`);

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

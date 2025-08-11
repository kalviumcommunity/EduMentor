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

// Function to handle API request
async function handleApiRequest(prompt) {
  const startTime = process.hrtime();

  try {
    const completion = await groq.chat.completions.create({
      messages: [...conversationHistory, { role: "user", content: prompt }],
      model: "llama3-8b-8192",
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1024,
      stream: false,
    });

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

    const botReply = completion.choices[0].message.content;

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
  console.log("Dynamic Prompting Chat - Type 'exit' to quit.\n");

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

    try {
      const validatedPrompt = validatePrompt(prompt);

      console.log("\nGenerating response...");
      const result = await handleApiRequest(validatedPrompt);

      if (result.success) {
        console.log(`Assistant: ${result.data}`);
        console.log(`\nResponse Time: ${result.responseTime}ms`);
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

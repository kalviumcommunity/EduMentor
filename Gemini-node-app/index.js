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

// Validate the prompt
function validatePrompt(prompt) {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt cannot be empty");
  }
  if (prompt.length > 1000) {
    throw new Error("Prompt is too long (max 1000 characters)");
  }
  return prompt.trim();
}

// Function to get example conversations from user
async function getExamples() {
  const examples = [];
  console.log(
    "\nLet's set up some example conversations for multi-shot prompting."
  );
  console.log("Enter 'done' when you've finished adding examples.\n");

  while (true) {
    // Get user query
    const userPrompt = await new Promise((resolve) => {
      rl.question("Enter an example question (or 'done' to finish): ", resolve);
    });

    if (userPrompt.toLowerCase() === "done") break;

    // Get expected response
    const assistantResponse = await new Promise((resolve) => {
      rl.question("Enter the expected response: ", resolve);
    });

    examples.push(
      { role: "user", content: userPrompt },
      { role: "assistant", content: assistantResponse }
    );
  }

  return examples;
}

// Handle API response and measure performance
async function handleApiRequest(prompt, examples) {
  const startTime = process.hrtime();

  try {
    // Generate content using Groq with multi-shot prompting
    const completion = await groq.chat.completions.create({
      messages: [...examples, { role: "user", content: prompt }],
      model: "llama3-8b-8192",
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1024,
      stream: false,
    });

    // Calculate response time
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);

    return {
      success: true,
      data: completion.choices[0].message.content,
      responseTime: responseTime,
      tokensUsed: completion.usage?.total_tokens || "N/A",
    };
  } catch (error) {
    console.error("API Error:", error.message);
    return {
      success: false,
      error: error.message,
      responseTime: null,
    };
  }
}

async function run() {
  try {
    let totalRequests = 0;
    let totalResponseTime = 0;

    // Get examples from user first
    const examples = await getExamples();
    console.log("\nExample conversations set up successfully!");

    while (true) {
      // Get prompt from user
      const prompt = await new Promise((resolve) => {
        rl.question("\nEnter your prompt (or 'exit' to quit): ", resolve);
      });

      // Check if user wants to exit
      if (prompt.toLowerCase() === "exit") {
        // Print statistics before exiting
        if (totalRequests > 0) {
          console.log("\nSession Statistics:");
          console.log(`Total Requests: ${totalRequests}`);
          console.log(
            `Average Response Time: ${(
              totalResponseTime / totalRequests
            ).toFixed(2)}ms`
          );
        }
        rl.close();
        break;
      }

      try {
        // Validate prompt
        const validatedPrompt = validatePrompt(prompt);
        console.log("\nGenerating response...");

        // Make API request and measure performance
        const result = await handleApiRequest(validatedPrompt, examples);

        if (result.success) {
          console.log("\nResponse:", result.data);
          console.log(`\nResponse Time: ${result.responseTime}ms`);
          console.log(`Tokens Used: ${result.tokensUsed}`);

          // Update statistics
          totalRequests++;
          totalResponseTime += parseFloat(result.responseTime);
        } else {
          console.error("\nError:", result.error);
        }
      } catch (validationError) {
        console.error("\nValidation Error:", validationError.message);
      }
    }
  } catch (error) {
    console.error("Fatal Error:", error);
    rl.close();
  }
}

run();

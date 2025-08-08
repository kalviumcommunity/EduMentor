# 🎓 EduMentor - Your AI-Powered Personal Learning Assistant

EduMentor is an intelligent learning assistant that generates **personalized study plans**, delivers **daily learning goals**, explains **complex topics**, and adapts to every student's pace — all powered by **Gemini AI** and **Retrieval-Augmented Generation (RAG)**.

Whether you're learning **DSA, Web Development, or Machine Learning**, EduMentor becomes your always-available **AI mentor** to guide you step by step.

---

## 🚀 Features

- 📅 **Dynamic Study Roadmaps** – AI-generated plans based on your goals and deadlines.
- 🔍 **RAG-Powered Search** – Pulls from curated learning content (PDFs, blogs, YouTube, docs).
- 🧠 **Concept Explainer** – Ask any topic; get simplified explanations and real-world examples.
- ❓ **Daily Practice & Quizzes** – Adaptive quizzes and curated problem sets.
- 📊 **Progress Tracker** – Visual dashboards to monitor consistency and improvement.
- 🧑‍🏫 **Mentor Feedback** – Smart feedback engine to suggest next steps or revisions.

---

## 🛠️ Tech Stack

| Layer            | Tools & Technologies                       |
| ---------------- | ------------------------------------------ |
| 💻 Frontend      | React.js, Tailwind CSS                     |
| 🧠 AI Core       | Gemini Pro API, LangChain, RAG pipeline    |
| 🔍 Vector Search | Pinecone / Weaviate / ChromaDB             |
| 🌐 Backend       | Node.js, Express.js                        |
| 🗃️ Database      | MongoDB / PostgreSQL                       |
| 🔐 Auth          | JWT + Google OAuth                         |
| 📄 PDF Parsing   | pdf-parse, LangChain document loaders      |
| ☁️ Hosting       | Vercel (frontend), Render/Heroku (backend) |

---

## 🧪 RAG Architecture (Simplified)

```mermaid
graph LR
A[User Query] --> B[Retriever: Semantic Search]
B --> C[Document Chunk from Vector DB]
C --> D[Gemini AI: Context + Query]
D --> E[Final Answer / Study Plan]
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Groq API key (get it from [Groq Console](https://console.groq.com))

### Installation

1. Clone the repository:

```bash
git clone https://github.com/kalviumcommunity/EduMentor.git
cd EduMentor
```

2. Install dependencies:

```bash
cd Gemini-node-app
npm install
```

3. Create a `.env` file in the Gemini-node-app directory:

```bash
GROQ_API_KEY=your_api_key_here
```

4. Run the application:

```bash
node index.js
```

## 🤖 Multi-Shot vs Zero-Shot Prompting

### Multi-Shot Prompting

Multi-shot prompting is an advanced technique where we provide the AI model with example conversations before asking our actual question. This approach: 

1. **Learning by Example**: The model learns from user-provided examples of good Q&A pairs
2. **Consistent Format**: Helps maintain consistent response patterns and styles
3. **Context Training**: Improves accuracy by showing the model exactly what we want
4. **Dynamic Learning**: Users can input their own examples for custom response patterns

Example Structure:

```javascript
[
  { role: "user", content: "What are the best places in Paris?" },
  {
    role: "assistant",
    content: "The top attractions include Eiffel Tower, Louvre...",
  },
  // More examples...
  { role: "user", content: "Your actual question" },
];
```

### Zero-Shot Prompting

Zero-shot prompting is when the model handles queries without any examples. This approach:

1. **Direct Questioning**: Model responds based on its pre-trained knowledge
2. **Flexible Responses**: No format constraints from examples
3. **Quicker Setup**: No need to provide examples before asking questions

### Implementation Details

Our implementation supports both multi-shot and zero-shot prompting:

1. **Interactive Example Collection**:

```javascript
async function getExamples() {
  const examples = [];
  while (true) {
    // Get example Q&A pairs from user
    const userPrompt = await rl.question("Enter an example question: ");
    if (userPrompt === "done") break;
    const assistantResponse = await rl.question(
      "Enter the expected response: "
    );
    examples.push(
      { role: "user", content: userPrompt },
      { role: "assistant", content: assistantResponse }
    );
  }
  return examples;
}
```

2. **Dynamic Prompt Handling**:

```javascript
const completion = await groq.chat.completions.create({
  messages: [...examples, { role: "user", content: prompt }],
  model: "llama3-8b-8192",
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1024,
});
```

### Example Use Cases

1. **Educational Tutorials**:

```
User Example 1: "What is a variable in programming?"
Assistant Example 1: "A variable is a container that stores data values..."

User Example 2: "Explain arrays in simple terms"
Assistant Example 2: "An array is like a list that can hold multiple items..."

Actual Question: "What is a function in programming?"
```

2. **Technical Documentation**:

```
Review this code snippet for best practices and potential improvements:
[Your code here]
```

3. **Learning Path Generation**:

```
Create a study plan for learning React.js in 3 months for a beginner
```

4. **Problem Solving**:

```
How would you implement a binary search tree in JavaScript?
```

## 🔍 Performance Metrics

Our implementation includes comprehensive monitoring for both multi-shot and zero-shot approaches:

### Multi-Shot Metrics

- **Example Impact**: Measures how examples influence response quality
- **Context Length**: Monitors total tokens used by examples + prompt
- **Learning Efficiency**: Tracks improvement in responses with more examples

### General Metrics

- **Response Time Tracking**: Measures API response time for each query
- **Token Usage Monitoring**: Tracks token consumption for optimization
- **Error Handling**: Robust error management for reliable operation
- **Input Validation**: Ensures prompts meet quality standards
- **Example Management**: Validates and optimizes example conversations

### Current Performance

| Metric                | Value           |
| --------------------- | --------------- |
| Average Response Time | ~1.5-2 seconds  |
| Token Limit           | 1024 tokens     |
| Maximum Prompt Length | 1000 characters |
| Temperature           | 0.7             |
| Top P                 | 0.9             |

## 🛠️ API Configuration

The API is configured with optimal parameters for educational use:

```javascript
{
  model: "llama3-8b-8192",
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1024,
  stream: false
}
```

### Parameter Explanation

- **temperature**: Controls response creativity (0.7 balances accuracy and creativity)
- **top_p**: Nucleus sampling parameter for response diversity
- **max_tokens**: Maximum length of generated responses
- **stream**: Set to false for complete responses rather than streaming

## 📊 Usage Statistics

The application tracks session statistics including:

- Total number of requests
- Average response time
- Token usage per request
- Error rates and types

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

# 🎓 EduMentor — AI-Powered Personalized Learning Assistant

**EduMentor** is an intelligent, AI-powered learning companion that generates **custom study plans**, answers complex doubts, and tracks student progress — all powered by **Google’s Gemini Pro LLM** and a **RAG (Retrieval-Augmented Generation)** architecture.

---

## 🧠 Project Idea — What is EduMentor?

EduMentor acts like a virtual personal mentor that adapts to the learning needs of each student. The system:

- Understands the user’s current level and learning goal (e.g., "Learn DSA in 30 days")
- Uses **RAG** to retrieve accurate and topic-specific content from 40–50 pre-uploaded PDFs and resources
- Leverages **Gemini AI** to:
  - Generate a **personalized study roadmap**
  - Explain **complex concepts**
  - Ask and assess the user through **daily quizzes**
  - Offer feedback and motivation based on user progress

EduMentor is being built using:
- **Frontend**: React.js + Tailwind CSS
- **Backend**: Node.js + Express.js
- **AI Core**: Gemini Pro API
- **Vector DB**: ChromaDB / Pinecone
- **Database**: MongoDB

---

## 🔍 Core LLM Concepts Used

---

### 🧾 1. **Prompting**

**Prompting** is how we tell Gemini *what* we want it to do. In EduMentor, we’ll design **task-specific prompts** for:

- 📅 Roadmap generation  
  - *Prompt:* “Create a 20-day DSA roadmap for a beginner with daily topics and goals.”
- 🤖 Topic explanation  
  - *Prompt:* “Explain recursion in simple terms with a coding example.”
- ❓ Quiz generation  
  - *Prompt:* “Generate 5 multiple-choice questions on backtracking with answers.”

Prompts will be dynamically constructed using user input and/or retrieved context from documents. They will be **templated for consistency** and **parametrized** to include relevant data.

---

### 🧱 2. **Structured Output**

We’ll use **structured prompts** with Gemini to return results in a predefined format, making it easier to render on the frontend.

#### 📌 Example: Roadmap Output
```json
{
  "roadmap": [
    { "day": 1, "topic": "Recursion Basics", "resources": [...], "quizAvailable": true },
    { "day": 2, "topic": "Backtracking", "resources": [...], "quizAvailable": true }
  ]
}

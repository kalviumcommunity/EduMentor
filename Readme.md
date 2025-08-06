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

| Layer            | Tools & Technologies                                      |
|------------------|-----------------------------------------------------------|
| 💻 Frontend       | React.js, Tailwind CSS                                    |
| 🧠 AI Core        | Gemini Pro API, LangChain, RAG pipeline                   |
| 🔍 Vector Search  | Pinecone / Weaviate / ChromaDB                            |
| 🌐 Backend        | Node.js, Express.js                                       |
| 🗃️ Database       | MongoDB / PostgreSQL                                      |
| 🔐 Auth           | JWT + Google OAuth                                        |
| 📄 PDF Parsing    | pdf-parse, LangChain document loaders                     |
| ☁️ Hosting        | Vercel (frontend), Render/Heroku (backend)                |

---

## 🧪 RAG Architecture (Simplified)

```mermaid
graph LR
A[User Query] --> B[Retriever: Semantic Search]
B --> C[Document Chunk from Vector DB]
C --> D[Gemini AI: Context + Query]
D --> E[Final Answer / Study Plan]

<div align="center">
[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-InterviewMinds-blue?style=for-the-badge&logo=vercel)](https://interviewminds.vercel.app/)
[![GitHub Stars](https://img.shields.io/github/stars/theunstopabble/InterviewMinds?style=for-the-badge&logo=github)](https://github.com/theunstopabble/InterviewMinds)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-3C873A?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)
</div>

# 🧠 InterviewMinds.ai
**The Flagship AI Mock Interview SaaS for 2026 Placements** 🚀

> Transform your interview preparation with a **hyper-realistic, AI-driven simulation** that analyzes your resume, proctors your session, and provides **actionable feedback**.

## 📑 Table of Contents
- [📝 Overview](#-overview)
- [🎯 Why InterviewMinds?](#-why-interviewminds)
- [✨ Key Features](#-key-features)
- [📸 Screenshots](#-screenshots)
- [🏗️ Tech Stack](#️-tech-stack)
- [📁 Folder Structure](#-folder-structure)
- [🚀 Quick Start](#-quick-start)
- [🔐 Environment Variables](#-environment-variables)
- [🐛 Troubleshooting](#-troubleshooting)
- [📊 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 📝 Overview
InterviewMinds is a **production-grade, full-stack AI platform** designed to simulate **high-pressure technical interviews**. Unlike generic chatbots, InterviewMinds **parses your uploaded resume** to generate **context-aware questions** specific to your projects and tech stack.

Powered by **TurboRepo Monorepo** architecture:
- **React/Vite** frontend with **Shadcn UI**
- **Node/Express** backend with **MongoDB**
- **Groq (Llama 3)** for ultra-low latency AI
- **TensorFlow.js** for real-time proctoring
- **Live Code Sandbox** for technical assessments

**Live Demo**: [https://interviewminds.vercel.app/](https://interviewminds.vercel.app/)

## 🎯 Why InterviewMinds?

| Feature | InterviewMinds | Generic Chatbots | Pramp/Interviewing.io |
|---------|----------------|------------------|----------------------|
| **Resume-Based Questions** | ✅ **Personalized** | ❌ Static | ❌ Human only |
| **Real-time Proctoring** | ✅ **Face + Emotion** | ❌ None | ❌ None |
| **Live Code Compiler** | ✅ **Instant** | ❌ None | ✅ Human graded |
| **AI Voice Interviewer** | ✅ **Natural** | ⚠️ Text only | ❌ Human only |
| **Free & Open Source** | ✅ **100%** | ❌ Paid | ❌ Paid |
| **Low Latency AI** | ✅ **<500ms** | ❌ Slow | N/A |

## ✨ Key Features

### 🤖 AI-Driven Intelligence
- **Deep Resume Analysis**: PDF parsing → tech stack extraction → personalized questions
- **Adaptive Personas**: Vikram (Strict Tech), Neha (HR Friendly), Sam (System Design)
- **Contextual Questioning**: Questions evolve based on your responses

### 🎥 Immersive Interview Experience
- **Voice-to-Voice**: Real-time STT + TTS for natural conversation
- **Live Coding Sandbox**: CodeEditor + compiler with instant execution
- **Ultra Low Latency**: Groq API (<500ms responses)

### 🛡️ Smart Proctoring
- **Face Detection**: Monitors presence (TensorFlow.js)
- **Anti-Cheating**: Tab-switch + full-screen enforcement
- **Emotion Analysis**: Confidence/stress level tracking

### 📊 Analytics & Feedback
- **Detailed Scorecards**: Technical + Communication scores
- **Radar Charts**: Visual strength/weakness analysis
- **Video Review**: Timestamped feedback playback

## 📸 Screenshots

### Dashboard & Setup
![Dashboard](screenshots/dashboard.png)

### Live Interview Experience
![Interview](screenshots/interview.png)

### Proctoring + Code Editor
<div align="center">
  <img src="screenshots/proctoring.png" width="49%" alt="Proctoring in Action"/>
  <img src="screenshots/code-editor.png" width="49%" alt="Live Code Compiler"/>
</div>

## 🏗️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Monorepo** | TurboRepo, npm workspaces |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI |
| **Backend** | Node.js 20, Express, TypeScript |
| **Database** | MongoDB (Mongoose ODM) |
| **Auth** | Clerk (Google/GitHub/Email) |
| **AI/ML** | Groq (Llama 3), Google Gemini, TensorFlow.js |
| **Media** | Cloudinary, WebRTC |
| **Deployment** | Vercel (Frontend), Render (Backend) |

## 📁 Folder Structure
```bash
InterviewMinds
├── apps
│ ├── api # Backend Server (Node/Express)
│ │ ├── src
│ │ │ ├── config # Cloudinary/DB Config
│ │ │ ├── models # MongoDB Schemas (Interview, Resume)
│ │ │ ├── routes # API Routes (chat, compiler, interview, resume)
│ │ │ └── index.ts # Entry point
│ └── web # Frontend Client (React/Vite)
│ ├── public/models # TensorFlow.js Face Models
│ ├── src
│ │ ├── components # UI (ProctoringUI, CodeEditor)
│ │ ├── hooks # useSpeech, useProctoring
│ │ └── pages # Dashboard, Interview, Feedback
├── packages
│ └── shared # Shared Types/Utils
├── turbo.json # Monorepo Config
├── screenshots/ # README Screenshots
├── LICENSE
└── package.json
```
```bash

## 🚀 Quick Start

### Prerequisites
- Node.js **v20+**
- MongoDB (Atlas recommended)
- Clerk Account (https://clerk.com)
- Groq & Gemini API Keys

### Installation
```bash
git clone https://github.com/theunstopabble/InterviewMinds.git
cd InterviewMinds

# Install root dependencies
npm install

# Backend dependencies
cd apps/api && npm install && cd ../..

# Frontend dependencies
cd apps/web && npm install && cd ../..

```
### Run Development
```bash
npm run dev
```
```bash
Backend: http://localhost:8000
Frontend: http://localhost:5173
```
### 🔐 Environment Variables

```bash
PORT=8000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/interviewminds
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLIENT_URL=http://localhost:5173
```
### Frontend (apps/web/.env)

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:8000/api
```
### 🐛 Troubleshooting

```text
| Issue              | Solution                                   |
| ------------------ | ------------------------------------------ |
| Port 8000 in use   | lsof -ti:8000 \| xargs kill -9 (Linux/Mac) |
| MongoDB connection | Check Atlas IP whitelist + correct URI     |
| Clerk auth fail    | Verify publishable/secret keys match       |
| AI API errors      | Check rate limits in Groq/Gemini dashboard |
```
### 🤝 Contributing
1. Fork the project
2. Create feature branch: git checkout -b feature/AmazingFeature
3. Commit changes: git commit -m 'Add AmazingFeature'
4. Push to branch: git push origin feature/AmazingFeature
5. Open Pull Request

### 📄 License
Distributed under the MIT License. See LICENSE for more details.

<div align="center"> **Built with ❤️ by [Gautam Kumar](https://github.com/theunstopabble)** [![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/gautam-kumar-dev) [![Portfolio](https://img.shields.io/badge/Portfolio-Visit-black?style=for-the-badge&logo=website)](https://gautamkumar.dev) </div> ```

import { GoogleGenAI, Chat } from '@google/genai';
import { Module } from '../types';

declare global {
  interface Window {
    GEMINI_API_KEY?: string;
  }
}

let activeChat: Chat | null = null;

export const startReviewChatSession = async (module: Module) => {
    try {
        const apiKey = window.GEMINI_API_KEY;

        // More robust check for missing, placeholder, or invalid API key on the window object.
        if (!apiKey || apiKey.includes('REPLACE') || apiKey.length < 10) {
            console.error("Gemini API Key not found or is invalid on window.GEMINI_API_KEY. Check Netlify environment variables and snippet injection.");
            // Throw a new, specific error for the app to catch.
            throw new Error("AI_CONFIG_ERROR::API_KEY_MISSING_OR_INVALID_ON_WINDOW");
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const detailedContext = module.questions.map((q, i) => {
            const choicesText = Object.entries(q.choices).map(([key, value]) => `  ${key}) ${value}`).join('\n');
            return `Question ${i + 1}: ${q.text}\n${choicesText}\nCorrect Answer: ${q.correct}`;
        }).join('\n\n');

        const systemInstruction = `You are "CFM-AI", a specialized AI tutor for refrigeration and air conditioning technicians. Your current task is to help a trainee master the module: "${module.title}".

Your entire knowledge base for this session consists of the following questions, choices, and correct answers from the module:
---
${detailedContext}
---

Your primary role is to be a supportive and expert guide. When the trainee asks a question, you MUST use your knowledge base to inform your explanation. If their question relates to one of the topics, you can reference the concept to ground your explanation in the curriculum. For example, if they ask about 'superheat', you could say "That's a great question, it's a key concept for diagnosing if a system is running properly, like in the question about checking the refrigerant charge."

**CRITICAL RULE:** You must NEVER reveal the letter of the correct answer (e.g., "The answer is B"). Your purpose is to teach the underlying principles so the trainee can figure out the answer themselves. Explain the 'why' behind the correct concept. If a user asks "What is the answer to question 5?", you should respond by explaining the concept behind question 5.

Be encouraging, use clear language, and break down complex topics into simple steps. Use Markdown formatting like lists, bold text, and headings to make your explanations easy to read and understand.`;


        activeChat = ai.chats.create({
            model: 'gemini-2.5-pro',
            config: {
                systemInstruction: systemInstruction,
            }
        });
    } catch (error) {
        console.error("Failed to initialize Gemini review chat:", error);
        if (error instanceof Error) {
            if (error.message.includes("AI_CONFIG_ERROR")) {
                throw error;
            }
            if (error.message.includes('API key not valid')) {
                throw new Error("AI_CONFIG_ERROR::API_KEY_INVALID");
            }
        }
        throw new Error("Could not initialize the AI Assistant for review. Please check the browser console for more details.");
    }
};


export const sendMessageToBot = async (message: string): Promise<string> => {
    if (!activeChat) {
        throw new Error("The AI chat session is not active. Please start a review session first.");
    }
    try {
        const response = await activeChat.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Gemini API call failed:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
            activeChat = null; // Force re-initialization on next session
            throw new Error("The API key is invalid. Please check your configuration.");
        }
        throw new Error("Failed to get a response from the AI model. Please try again.");
    }
};
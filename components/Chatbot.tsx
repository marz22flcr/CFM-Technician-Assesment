import React, { useState, useEffect, useRef } from 'react';
import { sendMessageToBot } from '../services/geminiService';
import { ChatIcon, ClockIcon } from './Icons';
import { Module } from '../types';

interface ChatbotProps {
  onClose: () => void;
  module: Module;
  timeLeft: number | null;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ onClose, module, timeLeft }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      { sender: 'bot', text: `Hello! You're reviewing the "${module.title}" module. Ask me anything to help you prepare!` }
    ]);
  }, [module]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isLowTime = timeLeft !== null && timeLeft <= 300; // 5 minutes

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = { sender: 'user', text: trimmedInput };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const botResponse = await sendMessageToBot(trimmedInput);
      setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    } catch (error) {
      console.error(error);
      const errorMessage = (error instanceof Error && error.message) ? error.message : "Sorry, I'm having trouble connecting. Please try again later.";
      setMessages(prev => [...prev, { sender: 'bot', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-center items-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative z-50 flex flex-col w-full max-w-lg h-[80vh] max-h-[700px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        <header className="flex items-center justify-between p-4 bg-cfm-dark text-white border-b border-cfm-blue/50">
          <div className="flex items-center space-x-3">
            <ChatIcon className="h-6 w-6"/>
            <h2 className="text-lg font-bold">AI Reviewer: {module.title}</h2>
          </div>
          <div className="flex items-center space-x-4">
            {timeLeft !== null && (
                <div className={`flex items-center space-x-2 py-1 px-3 rounded-lg ${isLowTime ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`}>
                    <ClockIcon className="h-5 w-5" />
                    <span className="font-mono font-bold text-lg">
                        {formatTime(timeLeft)}
                    </span>
                </div>
            )}
            <button onClick={onClose} className="text-2xl leading-none text-white/70 hover:text-white">&times;</button>
          </div>
        </header>

        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-cfm-blue text-white rounded-br-lg' : 'bg-gray-200 text-gray-800 rounded-bl-lg'}`}>
                <p className="text-sm" dangerouslySetInnerHTML={{__html: msg.text.replace(/\n/g, '<br />')}}></p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
              <div className="max-w-xs p-3 rounded-2xl bg-gray-200 text-gray-800 rounded-bl-lg">
                <div className="flex items-center space-x-1">
                  <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-cfm-blue focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-cfm-blue text-white rounded-full p-2 hover:bg-cfm-dark disabled:bg-gray-400 transition-colors"
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;

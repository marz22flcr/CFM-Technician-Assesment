import React, { useEffect, useState } from 'react';
import { Module } from '../types';
import { WarningIcon } from './Icons';

declare global {
  interface Window {
    marked: any;
  }
}

interface ReviewerProps {
  module: Module;
  onBack: () => void;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const FallbackReviewer: React.FC<{ module: Module }> = ({ module }) => (
  <div className="space-y-6">
    <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-r-lg">
        <h4 className="font-bold">Displaying Fallback</h4>
        <p className="text-sm">The AI-generated study guide could not be loaded. Here is the standard question and answer review.</p>
    </div>
    {module.questions.map((q, index) => (
      <div key={q.id} className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-gray-200">
        <p className="text-lg font-semibold text-gray-800 mb-4">
          <span className="text-cfm-blue font-bold">Q{index + 1}:</span> {q.text}
        </p>
        <div className="space-y-3">
          {Object.entries(q.choices).map(([key, value]) => {
            const isCorrect = key === q.correct;
            return (
              <div
                key={key}
                className={`flex items-start p-3 rounded-lg border ${
                  isCorrect
                    ? 'bg-green-100/70 border-success text-green-900 font-semibold'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <span className="font-bold mr-2">{key}.</span>
                <span className="flex-1">{value}</span>
                {isCorrect && <span className="text-xl ml-4" title="Correct Answer">✔️</span>}
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

const Reviewer: React.FC<ReviewerProps> = ({ module, onBack, content, isLoading, error, onRetry }) => {
  const [showFallback, setShowFallback] = useState(false);
  const [isMarkedReady, setIsMarkedReady] = useState(false);

  useEffect(() => {
    // Reset fallback view when the module changes
    setShowFallback(false);
  }, [module]);

  useEffect(() => {
    // Check if marked is loaded. It's loaded via CDN so might not be ready immediately.
    if (typeof window.marked?.parse === 'function') {
        setIsMarkedReady(true);
        return;
    }

    // Poll for marked to be ready if it's not there on first check.
    const interval = setInterval(() => {
        if (typeof window.marked?.parse === 'function') {
            setIsMarkedReady(true);
            clearInterval(interval);
        }
    }, 100);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-20 px-4 bg-white rounded-2xl shadow-lg">
          <div className="w-12 h-12 border-4 border-cfm-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-cfm-dark">Generating Your Study Guide...</h3>
          <p className="text-gray-600 mt-2">Our AI is crafting a personalized review for this module. This may take a moment.</p>
        </div>
      );
    }

    if (error && !showFallback) {
      return (
         <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-lg border-t-4 border-error">
            <WarningIcon className="h-12 w-12 text-error mx-auto mb-4" />
            <h3 className="text-xl font-bold text-cfm-dark">Generation Failed</h3>
            <p className="text-gray-600 mt-2 mb-6 max-w-md mx-auto">We couldn't generate the AI-powered study guide at this time. Please check your connection or try again.</p>
            <div className="flex justify-center items-center space-x-4">
                <button
                    onClick={onRetry}
                    className="px-6 py-2 rounded-lg font-semibold bg-cfm-blue text-white hover:bg-cfm-dark transition duration-150"
                >
                    Retry
                </button>
                 <button
                    onClick={() => setShowFallback(true)}
                    className="px-6 py-2 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition duration-150"
                >
                    Show Q&amp;A Review
                </button>
            </div>
        </div>
      );
    }
    
    if (showFallback) {
        return <FallbackReviewer module={module} />;
    }

    if (content) {
      if (!isMarkedReady) {
          return (
            <div className="text-center py-20 px-4 bg-white rounded-2xl shadow-lg">
               <div className="w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-gray-600">Preparing review content...</p>
            </div>
          );
      }
      const htmlContent = window.marked.parse(content);
      return (
        <>
            <div 
                className="bg-white rounded-2xl shadow-lg p-8 prose-like"
                dangerouslySetInnerHTML={{ __html: htmlContent }} 
            />
            <div className="mt-4 text-center text-xs text-gray-500 italic">
                This study guide was generated by AI and is for supplementary purposes only.
            </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="max-w-4xl mx-auto my-8 px-4">
      <style>{`
        .prose-like h1, .prose-like h2, .prose-like h3 { font-weight: 800; color: #003366; margin-top: 1.5em; margin-bottom: 0.8em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
        .prose-like h1 { font-size: 1.875rem; }
        .prose-like h2 { font-size: 1.5rem; }
        .prose-like h3 { font-size: 1.25rem; }
        .prose-like p { line-height: 1.75; margin-bottom: 1.25em; color: #374151; }
        .prose-like ul { list-style-position: inside; margin-left: 1.5em; margin-bottom: 1.25em; }
        .prose-like li { margin-bottom: 0.5em; }
        .prose-like strong { color: #003366; }
      `}</style>

      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border-t-8 border-cfm-blue">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="mb-4 sm:mb-0">
            <p className="text-sm font-semibold text-cfm-blue uppercase">Study Guide</p>
            <h2 className="text-3xl font-extrabold text-cfm-dark">{module.title}</h2>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition duration-150 shadow-md self-start sm:self-center"
          >
            &larr; Back to Lobby
          </button>
        </div>
      </div>

      {renderContent()}
      
      <div className="mt-8 text-center">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg font-semibold bg-cfm-blue text-white hover:bg-cfm-dark transition duration-150 shadow-lg"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
};

export default Reviewer;

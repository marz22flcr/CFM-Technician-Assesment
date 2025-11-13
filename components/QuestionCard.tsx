
import React from 'react';
import { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  currentAnswer: string | undefined;
  onAnswerChange: (questionId: string, answer: string) => void;
  questionIndex: number;
  totalQuestions: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, currentAnswer, onAnswerChange, questionIndex, totalQuestions }) => {
  const choices = Object.entries(question.choices);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-t-4 border-cfm-blue">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-cfm-dark">
          Question {questionIndex + 1} of {totalQuestions}
        </h3>
      </div>
      <p className="text-xl font-medium text-gray-800 mb-6">{question.text}</p>

      <div className="space-y-4">
        {choices.map(([key, value]) => (
          <label
            key={key}
            className={`
              block p-4 rounded-xl cursor-pointer transition duration-150 ease-in-out relative
              ${currentAnswer === key
                ? 'bg-cfm-blue text-white shadow-md ring-2 ring-offset-2 ring-cfm-blue'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }
            `}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onAnswerChange(question.id, key); }}
          >
            <input
              type="radio"
              name={question.id}
              value={key}
              checked={currentAnswer === key}
              onChange={() => onAnswerChange(question.id, key)}
              className="opacity-0 absolute"
            />
            <span className="font-bold mr-2">{key}.</span>
            <span>{value}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default QuestionCard;

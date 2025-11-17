
import React, { useState, useCallback } from 'react';
import { View, Module, ExamSession, ModuleResult, ExamRecord } from '../types';
import QuestionCard from './QuestionCard';
import { WarningIcon } from './Icons';

interface ModuleRunnerProps {
  modules: Module[];
  examSession: ExamSession;
  setExamSession: React.Dispatch<React.SetStateAction<ExamSession>>;
  finalizeExam: () => Promise<ExamRecord>;
  navigate: (view: View, data?: any) => void;
}

const ModuleRunner: React.FC<ModuleRunnerProps> = ({ modules, examSession, setExamSession, finalizeExam, navigate }) => {
  const currentModule = modules[examSession.currentModuleIndex];
  const totalModules = modules.length;

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [moduleScore, setModuleScore] = useState<ModuleResult | null>(null);
  const [unselectedError, setUnselectedError] = useState(false);

  const currentQuestion = currentModule.questions[currentQIndex];
  const isLastQuestionInModule = currentQIndex === currentModule.questions.length - 1;
  const isModuleSubmitted = examSession.submittedModules[currentModule.id];
  const userSelectedAnswer = examSession.answers[currentQuestion.id];

  const moduleProgress = (currentQIndex) / currentModule.questions.length;

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    if (isModuleSubmitted) return;
    setExamSession(prev => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer },
    }));
    setUnselectedError(false);
  }, [isModuleSubmitted, setExamSession]);

  const handleSubmitModule = () => {
    if (isModuleSubmitted) return;

    let score = 0;
    currentModule.questions.forEach(q => {
      if (examSession.answers[q.id] === q.correct) {
        score++;
      }
    });

    const newModuleResult = { score, total: currentModule.questions.length };

    setExamSession(prev => ({
      ...prev,
      moduleResults: { ...prev.moduleResults, [currentModule.id]: newModuleResult },
      submittedModules: { ...prev.submittedModules, [currentModule.id]: true },
    }));

    setModuleScore(newModuleResult);
    setShowScoreModal(true);
  };

  const handleNext = () => {
    if (!userSelectedAnswer) {
      setUnselectedError(true);
      return;
    }
    setUnselectedError(false);
    
    if (!isLastQuestionInModule) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      handleSubmitModule();
    }
  };

  const handlePrevious = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
      setUnselectedError(false);
    }
  };

  const handleNextModule = async () => {
    setShowScoreModal(false);
    
    const nextModuleIndex = examSession.currentModuleIndex + 1;

    if (nextModuleIndex < totalModules) {
      setExamSession(prev => ({ ...prev, currentModuleIndex: nextModuleIndex }));
      setCurrentQIndex(0);
    } else {
      const finalRecord = await finalizeExam();
      navigate('review', finalRecord);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border-l-4 border-cfm-dark">
        <h2 className="text-2xl font-bold text-cfm-dark">{`Module ${examSession.currentModuleIndex + 1}/${totalModules}: ${currentModule.title}`}</h2>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Module Progress ({currentQIndex + 1} / {currentModule.questions.length})</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-cfm-blue h-2.5 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${(moduleProgress + (1/currentModule.questions.length)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        currentAnswer={userSelectedAnswer}
        onAnswerChange={handleAnswerChange}
        questionIndex={currentQIndex}
        totalQuestions={currentModule.questions.length}
      />
      
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 sm:space-x-4 p-4 bg-white/70 backdrop-blur-sm sticky bottom-0 rounded-t-xl shadow-inner border-t">
        {unselectedError && (
            <p className="flex items-center text-error font-medium sm:mr-auto p-2 bg-red-100 rounded-lg w-full sm:w-auto justify-center">
                <WarningIcon className="h-5 w-5 mr-2" />
                Please select an option to proceed.
            </p>
        )}
        <div className="flex w-full sm:w-auto" style={{marginLeft: unselectedError ? '' : 'auto'}}>
            <button
              onClick={handlePrevious}
              className="w-1/2 sm:w-auto px-8 py-3 rounded-l-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition duration-150 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              disabled={isModuleSubmitted || currentQIndex === 0}
            >
              Previous
            </button>
            <button
                onClick={handleNext}
                className={`w-1/2 sm:w-auto px-8 py-3 rounded-r-lg font-semibold text-white shadow-md transition duration-150 ${!isModuleSubmitted ? 'bg-cfm-blue hover:bg-cfm-dark' : 'bg-gray-400 cursor-not-allowed'}`}
                disabled={isModuleSubmitted}
            >
                {isLastQuestionInModule ? 'Submit Module' : 'Next Question'}
            </button>
        </div>
      </div>

      {showScoreModal && moduleScore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
            <h3 className="text-3xl font-extrabold text-cfm-dark mb-2">Module Submitted!</h3>
            <p className="text-xl text-gray-600 mb-6">{currentModule.title}</p>
            <div className="p-6 bg-cfm-light rounded-xl mb-6">
              <p className="text-lg font-medium text-gray-700">Your Score:</p>
              <p className="text-5xl font-black text-success mt-1">{moduleScore.score} / {moduleScore.total}</p>
              <p className="text-sm text-gray-500 mt-2">({((moduleScore.score / moduleScore.total) * 100).toFixed(1)}%)</p>
            </div>
            <button
              onClick={handleNextModule}
              className="w-full bg-cfm-blue text-white py-3 px-4 rounded-lg font-semibold hover:bg-cfm-dark transition duration-150 shadow-md"
            >
              {examSession.currentModuleIndex === totalModules - 1 ? 'Finish Exam' : 'Proceed to Next Module'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleRunner;

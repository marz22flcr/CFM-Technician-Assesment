import React from 'react';
import { View, User, Module, ExamRecord } from '../types';
import { ClockIcon, ChatIcon } from './Icons';

interface LobbyProps {
  modules: Module[];
  navigate: (view: View) => void;
  user: User;
  onLogout: () => void;
  onJumpToModule: (moduleIndex: number) => void;
  userHistory: ExamRecord[];
  onViewRecord: (record: ExamRecord) => void;
  onStartReview: (module: Module) => void;
}

const HistoryCard: React.FC<{ record: ExamRecord; onView: () => void }> = ({ record, onView }) => {
    const { totalScore, totalPossible, timestamp } = record;
    const percentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    const isPassing = percentage >= 70;
    
    return (
        <div className={`p-4 bg-white rounded-xl flex items-center justify-between shadow-sm border-l-4 ${isPassing ? 'border-success' : 'border-error'}`}>
            <div>
                <p className="font-semibold text-cfm-dark">{new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm text-gray-500">{new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="flex items-center space-x-4">
                <div className="text-right">
                    <p className={`font-bold text-lg ${isPassing ? 'text-success' : 'text-error'}`}>{totalScore} / {totalPossible}</p>
                    <p className="text-sm font-semibold text-gray-600">{percentage.toFixed(1)}%</p>
                </div>
                <button
                    onClick={onView}
                    className="px-4 py-2 rounded-lg font-semibold text-sm bg-cfm-blue text-white hover:bg-cfm-dark transition duration-150 shadow-md"
                >
                    View Details
                </button>
            </div>
        </div>
    );
};


const Lobby: React.FC<LobbyProps> = ({ modules, navigate, user, onLogout, onJumpToModule, userHistory, onViewRecord, onStartReview }) => {
  const totalQuestions = modules.reduce((sum, mod) => sum + mod.questions.length, 0);

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="p-8 bg-white rounded-t-2xl shadow-xl border-t-8 border-cfm-blue">
        <h2 className="text-3xl font-extrabold text-cfm-dark mb-2">Welcome, {user.name}!</h2>
        <p className="text-gray-600 mb-6">
          Ready for your next assessment? This exam has {modules.length} modules, totaling {totalQuestions} questions. You can review the topics before starting.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('exam')}
            className="w-full bg-success text-white py-3 px-4 rounded-lg text-lg font-bold hover:bg-green-700 transition duration-150 shadow-lg"
          >
            Start Full Exam
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-2xl font-bold text-cfm-dark px-4 mb-4">Modules</h3>
        <div className="bg-gray-50 p-6 rounded-2xl shadow-inner space-y-4">
          {modules.map((module, index) => (
            <div key={module.id} className="p-4 bg-white rounded-xl flex flex-col sm:flex-row items-center justify-between shadow-sm border border-gray-200">
              <div className="mb-4 sm:mb-0 text-center sm:text-left w-full sm:w-auto">
                <p className="font-bold text-lg text-cfm-dark">Module {index + 1}: {module.title}</p>
                <p className="text-sm text-gray-500">{module.itemCount} items</p>
              </div>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                 <button
                  onClick={() => onStartReview(module)}
                  className="flex-1 sm:w-auto px-4 py-2 rounded-lg font-semibold text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition duration-150 flex items-center justify-center space-x-2"
                >
                  <ChatIcon className="h-4 w-4" />
                  <span>Review with AI</span>
                </button>
                <button
                  onClick={() => onJumpToModule(index)}
                  className="flex-1 sm:w-auto px-4 py-2 rounded-lg font-semibold text-sm bg-cfm-blue text-white hover:bg-cfm-dark transition duration-150 shadow-md"
                >
                  Start Module
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-2xl font-bold text-cfm-dark px-4 mb-4">Your Exam History</h3>
        <div className="bg-gray-50 p-6 rounded-2xl shadow-inner space-y-4">
            {userHistory.length > 0 ? (
                userHistory.map((record) => (
                    <HistoryCard key={record.id || record.timestamp} record={record} onView={() => onViewRecord(record)} />
                ))
            ) : (
                <div className="text-center py-10 px-4">
                    <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">You haven't taken any exams yet.</p>
                    <p className="text-sm text-gray-500">Your results will appear here after you complete your first assessment.</p>
                </div>
            )}
        </div>
      </div>

      <button
        onClick={onLogout}
        className="w-full mt-8 text-sm text-gray-500 hover:text-cfm-blue transition duration-150"
      >
        Logout and return to login screen
      </button>
    </div>
  );
};

export default Lobby;
import React, { useState, useMemo } from 'react';
// Fix: Import ModuleResult for type annotations.
import { View, ExamRecord, Module, ModuleResult } from '../types';
import ActionModal from './ActionModal';
import { USER_KEY } from '../constants';

interface FinalReviewProps {
  examRecord: ExamRecord | null;
  modules: Module[];
  navigate: (view: View) => void;
  isReviewingHistory: boolean;
}

const FinalReview: React.FC<FinalReviewProps> = ({ examRecord, modules, navigate, isReviewingHistory }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  if (!examRecord) {
    return <div className="text-center text-gray-600 mt-10">Loading results... If this persists, please start a new session.</div>;
  }

  const { totalScore, totalPossible, moduleResults, answers, user, timestamp } = examRecord;
  const percentage = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(2) : '0.00';
  const isPassing = parseFloat(percentage) >= 70;

  const reviewData = useMemo(() => modules.flatMap(mod =>
    mod.questions.map((q, qIdx) => ({
      moduleTitle: mod.title,
      questionNum: qIdx + 1,
      questionText: q.text,
      userAnswer: answers[q.id] || 'N/A',
      correctAnswer: q.correct,
      isCorrect: answers[q.id] === q.correct,
    }))
  ), [modules, answers]);

  const filteredReviewData = useMemo(() => reviewData.filter(item => {
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'incorrect') return !item.isCorrect;
    return true; // for 'all'
  }), [reviewData, filter]);

  const handleLogout = () => {
    localStorage.removeItem(USER_KEY);
    setShowLogoutConfirm(false);
    navigate('auth');
  };

  const FilterButton: React.FC<{
    currentFilter: typeof filter;
    filterType: typeof filter;
    count: number;
    onClick: () => void;
    children: React.ReactNode;
    color: string;
  }> = ({ currentFilter, filterType, count, onClick, children, color }) => {
    const isActive = currentFilter === filterType;
    const baseStyle = 'px-4 py-2 text-sm font-semibold rounded-lg transition duration-150 flex items-center space-x-2';
    const activeStyle = `text-white shadow-md ${color}`;
    const inactiveStyle = 'bg-gray-200 text-gray-700 hover:bg-gray-300';
    return (
      <button onClick={onClick} className={`${baseStyle} ${isActive ? activeStyle : inactiveStyle}`}>
        <span>{children}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${isActive ? 'bg-white/20' : 'bg-gray-300'}`}>{count}</span>
      </button>
    );
  };

  return (
    <div className="max-w-6xl mx-auto my-8 px-4">
      <div className={`bg-white rounded-2xl shadow-xl p-8 mb-8 border-t-8 ${isPassing ? 'border-success' : 'border-error'}`}>
        <h2 className="text-4xl font-extrabold text-cfm-dark mb-2">Final Assessment Results</h2>
        <p className="text-lg text-gray-600 mb-6">Trainee: <span className="font-semibold">{user.name}</span> | Date: {new Date(timestamp).toLocaleDateString()}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-cfm-light p-6 rounded-xl text-center shadow-md">
            <p className="text-lg font-medium text-gray-700">Overall Score</p>
            <p className={`text-6xl font-black mt-2 ${isPassing ? 'text-success' : 'text-error'}`}>
              {totalScore} / {totalPossible}
            </p>
            <p className="text-2xl font-bold mt-1 text-cfm-dark">{percentage}%</p>
          </div>

          <div className="md:col-span-2 bg-gray-50 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-cfm-dark mb-3 border-b pb-2">Per-Module Summary</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-48 overflow-y-auto pr-2">
              {/* Fix: Add explicit type for 'result' to resolve property access error on type 'unknown'. */}
              {Object.entries(moduleResults).map(([modId, result]: [string, ModuleResult]) => {
                const module = modules.find(m => m.id === modId);
                const modPercent = result.total > 0 ? ((result.score / result.total) * 100).toFixed(1) : '0.0';
                return (
                  <div key={modId} className="flex justify-between items-center text-sm p-3 rounded-lg border border-gray-200 bg-white shadow-sm">
                    <span className="font-medium text-gray-700 truncate" title={module?.title}>{module?.title}</span>
                    <span className="font-bold text-cfm-blue whitespace-nowrap">{result.score} / {result.total} <span className='text-xs text-gray-500'>({modPercent}%)</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-10 mb-4 border-b pb-2">
          <h3 className="text-2xl font-bold text-cfm-dark">Detailed Answer Review</h3>
          <div className="flex space-x-2">
            <FilterButton currentFilter={filter} filterType="all" count={reviewData.length} onClick={() => setFilter('all')} color="bg-cfm-blue">All</FilterButton>
            <FilterButton currentFilter={filter} filterType="correct" count={reviewData.filter(i => i.isCorrect).length} onClick={() => setFilter('correct')} color="bg-success">Correct</FilterButton>
            <FilterButton currentFilter={filter} filterType="incorrect" count={reviewData.filter(i => !i.isCorrect).length} onClick={() => setFilter('incorrect')} color="bg-error">Incorrect</FilterButton>
          </div>
        </div>

        <div className="overflow-x-auto bg-gray-50 rounded-xl shadow-inner max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-cfm-light sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Module</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Question</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Your Answer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Correct</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-cfm-dark uppercase tracking-wider">Result</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredReviewData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-500 italic">No {filter} answers to display.</td>
                </tr>
              ) : filteredReviewData.map((item, index) => (
                <tr key={index} className={item.isCorrect ? 'hover:bg-green-50/50' : 'bg-red-50/70'}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    M{modules.findIndex(m => m.title === item.moduleTitle) + 1}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 max-w-md truncate" title={item.questionText}>{item.questionText}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{item.userAnswer}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-success">{item.correctAnswer}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-xl">
                    {item.isCorrect ? <span title="Correct">✔️</span> : <span title="Incorrect">❌</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-8">
          {isReviewingHistory ? (
              <button
                onClick={() => navigate('lobby')}
                className="px-6 py-3 rounded-lg font-semibold bg-cfm-blue text-white hover:bg-cfm-dark transition duration-150 shadow-md"
              >
                Back to Lobby
              </button>
          ) : (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="px-6 py-3 rounded-lg font-semibold bg-gray-500 text-white hover:bg-gray-700 transition duration-150 shadow-md"
              >
                Logout & Start New Exam
              </button>
          )}
        </div>
      </div>

      {showLogoutConfirm && (
        <ActionModal
          isVisible={true}
          title="Confirm Logout"
          message="Are you sure you want to end this session? Your exam results are saved."
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
          showCancel={true}
        />
      )}
    </div>
  );
};

export default FinalReview;

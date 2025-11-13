import React, { useState } from 'react';
// Fix: Import ModuleResult for type annotations.
import { View, ExamRecord, Module, ModuleResult } from '../types';
import ActionModal from './ActionModal';
import { USER_KEY } from '../constants';

interface FinalReviewProps {
  examRecord: ExamRecord | null;
  modules: Module[];
  navigate: (view: View) => void;
}

const FinalReview: React.FC<FinalReviewProps> = ({ examRecord, modules, navigate }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!examRecord) {
    return <div className="text-center text-gray-600 mt-10">Loading results... If this persists, please start a new session.</div>;
  }

  const { totalScore, totalPossible, moduleResults, answers, user, timestamp } = examRecord;
  const percentage = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(2) : '0.00';
  const isPassing = parseFloat(percentage) >= 70;

  const reviewData = modules.flatMap(mod =>
    mod.questions.map((q, qIdx) => ({
      moduleTitle: mod.title,
      questionNum: qIdx + 1,
      questionText: q.text,
      userAnswer: answers[q.id] || 'N/A',
      correctAnswer: q.correct,
      isCorrect: answers[q.id] === q.correct,
    }))
  );

  const handleLogout = () => {
    localStorage.removeItem(USER_KEY);
    setShowLogoutConfirm(false);
    navigate('auth');
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

        <h3 className="text-2xl font-bold text-cfm-dark mt-10 mb-4 border-b pb-2">Detailed Answer Review</h3>
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
              {reviewData.map((item, index) => (
                <tr key={index} className={item.isCorrect ? 'hover:bg-green-50/50' : 'bg-red-50/50 hover:bg-red-100/70'}>
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

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="mt-8 px-6 py-3 rounded-lg font-semibold bg-gray-500 text-white hover:bg-gray-700 transition duration-150 shadow-md float-right"
        >
          Logout & Start New Exam
        </button>
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

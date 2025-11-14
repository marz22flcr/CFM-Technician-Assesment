

import React, { useState } from 'react';
import { View, User, Module } from '../types';

interface LobbyProps {
  modules: Module[];
  navigate: (view: View) => void;
  user: User;
  onLogout: () => void;
  onJumpToModule: (moduleIndex: number) => void;
}

const Lobby: React.FC<LobbyProps> = ({ modules, navigate, user, onLogout, onJumpToModule }) => {
  const totalQuestions = modules.reduce((sum, mod) => sum + mod.questions.length, 0);
  const [showJumpList, setShowJumpList] = useState(false);

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h2 className="text-3xl font-extrabold text-cfm-dark mb-2">Welcome, {user.name}!</h2>
      <p className="text-gray-600 mb-6">
        This is the Comprehensive Assessment, divided into {modules.length} modules, totaling {totalQuestions} questions.
      </p>

      <div className="space-y-3 mb-8">
        {modules.map((module, index) => (
          <div key={module.id} className="p-4 bg-cfm-light rounded-lg flex justify-between items-center shadow-inner">
            <span className="font-semibold text-gray-800">Module {index + 1}: {module.title}</span>
            <span className="text-sm text-cfm-dark font-mono">{module.questions.length} Items</span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <button
          onClick={() => navigate('exam')}
          className="w-full bg-success text-white py-3 px-4 rounded-lg text-lg font-bold hover:bg-green-700 transition duration-150 shadow-lg"
        >
          Start Exam Now
        </button>

        <button
          onClick={() => setShowJumpList(prev => !prev)}
          className="w-full bg-gray-100 text-cfm-dark py-2 px-4 rounded-lg font-semibold hover:bg-gray-200 transition duration-150 shadow-sm"
          aria-expanded={showJumpList}
        >
          {showJumpList ? 'Hide Module List' : 'Jump to a Specific Module'}
        </button>
      </div>

      {showJumpList && (
        <div className="mt-6 border-t pt-4 animate-fade-in">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">Select a module to begin:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modules.map((module, index) => (
              <button
                key={module.id}
                onClick={() => onJumpToModule(index)}
                className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:bg-cfm-light hover:border-cfm-blue transition duration-150 shadow-sm"
              >
                <span className="font-semibold text-cfm-dark">Module {index + 1}</span>
                <p className="text-sm text-gray-600 truncate" title={module.title}>{module.title}</p>
              </button>
            ))}
          </div>
        </div>
      )}

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
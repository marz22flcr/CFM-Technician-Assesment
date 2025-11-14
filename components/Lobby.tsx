

import React from 'react';
import { View, User, Module } from '../types';

interface LobbyProps {
  modules: Module[];
  navigate: (view: View) => void;
  user: User;
  onLogout: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ modules, navigate, user, onLogout }) => {
  const totalQuestions = modules.reduce((sum, mod) => sum + mod.questions.length, 0);

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

      <button
        onClick={() => navigate('exam')}
        className="w-full bg-success text-white py-3 px-4 rounded-lg text-lg font-bold hover:bg-green-700 transition duration-150 shadow-lg"
      >
        Start Exam Now
      </button>

      <button
        onClick={onLogout}
        className="w-full mt-4 text-sm text-gray-500 hover:text-cfm-blue transition duration-150"
      >
        Logout and return to login screen
      </button>
    </div>
  );
};

export default Lobby;
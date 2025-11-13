
import React from 'react';
import { User } from '../types';
import { WrenchIcon, UserIcon } from './Icons';

interface HeaderProps {
  user: User | null;
  totalPossible: number | null;
  currentScore: number | null;
  progress: number | null;
}

const Header: React.FC<HeaderProps> = ({ user, totalPossible, currentScore, progress }) => {
  const currentTotal = totalPossible || 100;

  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <WrenchIcon className="h-8 w-8 text-cfm-blue" />
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-cfm-dark">CFM Training Institute Inc.</h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Technician Training Assessment</p>
          </div>
        </div>

        {user?.name && (
          <div className="flex flex-col items-end">
            <div className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
              <UserIcon className="h-4 w-4 text-cfm-blue" />
              <span>{user.name}</span>
            </div>
            {currentScore !== null && (
              <div className="mt-1 text-sm text-gray-500">
                Score: <span className="font-bold text-cfm-blue">{currentScore} / {currentTotal}</span>
              </div>
            )}
            {progress !== null && (
               <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                <div
                  className="bg-cfm-blue h-1.5 rounded-full transition-all duration-500 ease-in-out"
                  style={{ width: `${progress * 100}%` }}
                ></div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

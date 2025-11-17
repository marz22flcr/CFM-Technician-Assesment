import React from 'react';
import { User } from '../types';
import { WrenchIcon, UserIcon, ClockIcon, LogoutIcon } from './Icons';

interface HeaderProps {
  user: User | null;
  totalPossible: number | null;
  currentScore: number | null;
  progress: number | null;
  timeLeft: number | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, totalPossible, currentScore, progress, timeLeft, onLogout }) => {
  const currentTotal = totalPossible || 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isLowTime = timeLeft !== null && timeLeft <= 300; // 5 minutes

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
          <div className="flex items-center space-x-4">
            {timeLeft !== null && (
                <div className={`flex items-center space-x-2 p-2 rounded-lg ${isLowTime ? 'bg-red-100' : 'bg-gray-100'}`}>
                    <ClockIcon className={`h-5 w-5 ${isLowTime ? 'text-error' : 'text-gray-600'}`} />
                    <span className={`font-mono font-bold text-lg ${isLowTime ? 'text-error' : 'text-cfm-dark'}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
            )}
            <div className="flex items-center space-x-3">
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
              <button
                onClick={onLogout}
                className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-error transition-colors self-center"
                title="Logout"
                aria-label="Logout"
              >
                <LogoutIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
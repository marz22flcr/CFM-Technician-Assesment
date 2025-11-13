
import React from 'react';
import { ModalDetails } from '../types';

interface ActionModalProps {
  isVisible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  showCancel: boolean;
  details?: ModalDetails[] | null;
  detailTitle?: string;
}

const ActionModal: React.FC<ActionModalProps> = ({ isVisible, title, message, onConfirm, onCancel, showCancel, details, detailTitle }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-up">
        <h3 className="text-2xl font-bold text-cfm-dark mb-2 border-b pb-2">{title}</h3>
        <p className="text-gray-700 mb-4">{message}</p>

        {details && (
          <div className="mt-4 bg-gray-50 p-4 rounded-xl max-h-60 overflow-y-auto shadow-inner">
            <h4 className="font-semibold text-cfm-blue mb-2">{detailTitle}</h4>
            {details.map((item, index) => (
              <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-200 last:border-b-0">
                <span className="font-medium text-gray-700 truncate pr-2" title={item.title}>{item.title}</span>
                <span className="font-bold text-cfm-dark whitespace-nowrap">{item.score} / {item.total} <span className='text-xs text-gray-500'>({item.percent}%)</span></span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg font-semibold bg-gray-300 text-gray-700 hover:bg-gray-400 transition duration-150"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-semibold text-white transition duration-150 ${
              showCancel ? 'bg-error hover:bg-red-700' : 'bg-cfm-blue hover:bg-cfm-dark'
            }`}
          >
            {showCancel ? 'Confirm Action' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;

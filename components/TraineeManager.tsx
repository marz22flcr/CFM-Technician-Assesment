
import React, { useState } from 'react';
import { FirestoreDB, ModalState, Trainee, TraineeList } from '../types';
import { addTrainee, deleteTrainee } from '../services/firebaseService';
import ActionModal from './ActionModal';
import { PlusIcon, TrashIcon } from './Icons';

const EyeIcon: React.FC<{ slashed?: boolean }> = ({ slashed }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {slashed ? (
            <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1={1} y1={1} x2={23} y2={23} />
            </>
        ) : (
            <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx={12} cy={12} r={3} />
            </>
        )}
    </svg>
);


interface TraineeManagerProps {
  trainees: TraineeList;
  db: FirestoreDB | null;
  isFirebaseReady: boolean;
  setModalState: React.Dispatch<React.SetStateAction<ModalState | null>>;
}

const TraineeManager: React.FC<TraineeManagerProps> = ({ trainees, db, isFirebaseReady, setModalState }) => {
  const [newTrainee, setNewTrainee] = useState({ username: '', password: '', name: '', email: '', id: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [traineeToDelete, setTraineeToDelete] = useState<string | null>(null);

  const getValidationError = (name: string, value: string): string => {
    switch (name) {
      case 'username': {
        const trimmed = value.trim();
        if (!trimmed) return 'Required.';
        if (trimmed.length < 3) return 'Min 3 chars.';
        if (/\s/.test(trimmed)) return 'No spaces.';
        if (trainees[trimmed]) return 'In use.';
        break;
      }
      case 'password': {
        const trimmed = value.trim();
        if (!trimmed) return 'Required.';
        if (trimmed.length < 6) return 'Min 6 chars.';
        break;
      }
      case 'name':
        if (!value.trim()) return 'Required.';
        break;
      case 'email':
        const trimmed = value.trim();
        if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return 'Invalid email.';
        }
        break;
    }
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTrainee(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const error = getValidationError(name, value);
      setErrors(prev => {
        const newErrors = { ...prev };
        if (error) newErrors[name] = error;
        else delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const error = getValidationError(name, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) newErrors[name] = error;
      else delete newErrors[name];
      return newErrors;
    });
  };

  const validateForm = (): boolean => {
    const { username, password, name, email } = newTrainee;
    const validationErrors: Record<string, string> = {};
    const usernameError = getValidationError('username', username);
    if (usernameError) validationErrors.username = usernameError;
    const passwordError = getValidationError('password', password);
    if (passwordError) validationErrors.password = passwordError;
    const nameError = getValidationError('name', name);
    if (nameError) validationErrors.name = nameError;
    const emailError = getValidationError('email', email);
    if (emailError) validationErrors.email = emailError;
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleAddTrainee = async () => {
    if (!validateForm()) return;
    if (!db || !isFirebaseReady) {
      setErrors(prev => ({...prev, form: 'Database not ready.' }));
      return;
    }
    try {
      const traineeData: Trainee = {
        password: newTrainee.password.trim(),
        name: newTrainee.name.trim(),
        email: newTrainee.email.trim(),
        id: newTrainee.id.trim(),
      };
      await addTrainee(db, newTrainee.username.trim(), traineeData);
      setNewTrainee({ username: '', password: '', name: '', email: '', id: '' });
      setErrors({});
    } catch (err) {
      setErrors({ form: 'Failed to add trainee.' });
      console.error(err);
    }
  };

  const handleDeleteTrainee = async () => {
    if (!traineeToDelete || !db || !isFirebaseReady) return;
    try {
      await deleteTrainee(db, traineeToDelete);
      setTraineeToDelete(null);
    } catch (err) {
      console.error("Failed to delete trainee:", err);
      setTraineeToDelete(null);
      setModalState({
          title: "Deletion Failed",
          message: `Could not delete trainee "${traineeToDelete}". Please check the connection and try again.`,
          isError: true,
      });
    }
  };

  const togglePasswordVisibility = (username: string) => {
    setVisiblePasswords(prev => ({ ...prev, [username]: !prev[username] }));
  };
  
  const inputBaseStyle = "block w-full px-2 py-1.5 border rounded-md shadow-sm sm:text-sm bg-white focus:ring-1 focus:outline-none";
  const inputNormalStyle = "border-gray-300 focus:ring-cfm-blue focus:border-cfm-blue";
  const inputErrorStyle = "border-error ring-1 ring-error focus:ring-error focus:border-error";

  const renderInput = (name: keyof typeof newTrainee, placeholder: string, type: string = 'text') => (
    <div className="relative">
      <input 
        type={type} name={name} placeholder={placeholder} 
        value={newTrainee[name]} 
        onChange={handleInputChange} 
        onBlur={handleBlur}
        className={`${inputBaseStyle} ${errors[name] ? inputErrorStyle : inputNormalStyle} disabled:bg-gray-100`}
        disabled={!isFirebaseReady}
        aria-invalid={!!errors[name]}
      />
      {errors[name] && <span className="absolute -top-5 right-0 text-xs text-error font-semibold bg-red-100 px-1.5 py-0.5 rounded-full">{errors[name]}</span>}
    </div>
  );

  return (
    <div>
       <div className="overflow-x-auto bg-gray-50 rounded-xl shadow-inner">
         <table className="min-w-full divide-y divide-gray-200">
           <thead className="bg-cfm-light">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Email/ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Password</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-cfm-dark uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
             <tbody className="bg-white divide-y divide-gray-100">
             {Object.entries(trainees).map(([username, details]: [string, Trainee]) => (
                <tr key={username} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">{username}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{details.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{details.email || details.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex items-center space-x-2">
                           <span className="font-mono">{visiblePasswords[username] ? details.password : '••••••••'}</span>
                           <button onClick={() => togglePasswordVisibility(username)} className="text-gray-500 hover:text-cfm-blue" aria-label={`Show password for ${username}`}>
                               <EyeIcon slashed={visiblePasswords[username]} />
                           </button>
                        </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <button onClick={() => setTraineeToDelete(username)} className="text-gray-400 hover:text-error disabled:text-gray-300 disabled:cursor-not-allowed" disabled={!isFirebaseReady} aria-label={`Delete ${username}`}>
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </td>
                </tr>
             ))}
             <tr className="bg-gray-50">
                <td className="px-4 py-3">{renderInput('username', 'new_user*')}</td>
                <td className="px-4 py-3">{renderInput('name', 'Full Name*')}</td>
                <td className="px-4 py-3">{renderInput('email', 'Email / ID')}</td>
                <td className="px-4 py-3">{renderInput('password', 'Password*')}</td>
                <td className="px-4 py-3 text-center">
                    <button onClick={handleAddTrainee} className="bg-success text-white p-2 rounded-full hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={!isFirebaseReady} aria-label="Add new trainee">
                        <PlusIcon className="h-5 w-5" />
                    </button>
                </td>
             </tr>
             </tbody>
         </table>
        </div>
        
        {traineeToDelete && (
            <ActionModal 
                isVisible={true} 
                title="Confirm Deletion" 
                message={`Are you sure you want to delete the trainee "${traineeToDelete}"? This action cannot be undone.`} 
                onConfirm={handleDeleteTrainee} 
                onCancel={() => setTraineeToDelete(null)} 
                showCancel={true} 
            />
        )}
    </div>
  );
};

export default TraineeManager;

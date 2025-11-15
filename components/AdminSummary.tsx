
import React, { useState, useEffect, useMemo } from 'react';
// Fix: Import ModuleResult for type annotations.
// FIX: Import Trainee type to be used for explicit typing.
import { View, ExamRecord, SortKey, SortDirection, ModalState, FirestoreDB, Module, ModalDetails, ModuleResult, TraineeList, Trainee } from '../types';
import { listenForResults, clearAllResults, addTrainee, deleteTrainee } from '../services/firebaseService';
import { exportCsv } from '../services/csvExporter';
import { EXAM_DATA } from '../constants';
import ActionModal from './ActionModal';
import { WarningIcon } from './Icons';

interface AdminSummaryProps {
  navigate: (view: View) => void;
  db: FirestoreDB | null;
  isFirebaseReady: boolean;
  trainees: TraineeList;
}

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

  // Centralized validation logic, returns error string or empty string for success.
  const getValidationError = (name: string, value: string): string => {
    switch (name) {
      case 'username': {
        const trimmed = value.trim();
        if (!trimmed) return 'Username is required.';
        if (trimmed.length < 3) return 'Username must be at least 3 characters long.';
        if (/\s/.test(trimmed)) return 'Username cannot contain spaces.';
        if (trainees[trimmed]) return 'Username already exists.';
        break;
      }
      case 'password': {
        const trimmed = value.trim();
        if (!trimmed) return 'Password is required.';
        if (trimmed.length < 6) return 'Password must be at least 6 characters long.';
        break;
      }
      case 'name':
        if (!value.trim()) return 'Full Name is required.';
        break;
      case 'email':
        const trimmed = value.trim();
        if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return 'Please enter a valid email address.';
        }
        break;
    }
    return ''; // No error
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTrainee(prev => ({ ...prev, [name]: value }));

    // If an error is currently shown for this field, re-validate on change
    // to give immediate feedback that the user is fixing it.
    if (errors[name]) {
      const error = getValidationError(name, value);
      setErrors(prev => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[name] = error; // Update the error message if it still fails
        } else {
          delete newErrors[name]; // Clear the error as it's now valid
        }
        return newErrors;
      });
    }
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const error = getValidationError(name, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }
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

  const handleAddTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Run full validation on submit and stop if invalid
    if (!validateForm()) {
      return;
    }
    
    if (!db || !isFirebaseReady) {
      setErrors(prev => ({...prev, form: 'Database connection not ready. Please wait a moment.' }));
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
      setErrors({ form: 'Failed to add trainee. Please try again.' });
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
  
  const inputBaseStyle = "mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue sm:text-sm";
  const inputNormalStyle = "border-gray-300";
  const inputErrorStyle = "border-error ring-1 ring-error";

  return (
    <div>
      <div className="bg-gray-50 p-6 rounded-xl mb-8 shadow-inner relative">
        <h3 className="text-xl font-bold text-cfm-dark mb-4">Add New Trainee</h3>
        <form onSubmit={handleAddTrainee} noValidate>
          <fieldset disabled={!isFirebaseReady} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 items-start">
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 items-end">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username*</label>
                    <input type="text" name="username" id="username" value={newTrainee.username} onChange={handleInputChange} onBlur={handleBlur} className={`${inputBaseStyle} ${errors.username ? inputErrorStyle : inputNormalStyle}`} required aria-invalid={!!errors.username} aria-describedby={errors.username ? "username-error" : undefined} />
                    {errors.username && <p id="username-error" className="text-xs text-error mt-1">{errors.username}</p>}
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password*</label>
                    <input type="text" name="password" id="password" value={newTrainee.password} onChange={handleInputChange} onBlur={handleBlur} className={`${inputBaseStyle} ${errors.password ? inputErrorStyle : inputNormalStyle}`} required aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} />
                    {errors.password && <p id="password-error" className="text-xs text-error mt-1">{errors.password}</p>}
                </div>
                 <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name*</label>
                    <input type="text" name="name" id="name" value={newTrainee.name} onChange={handleInputChange} onBlur={handleBlur} className={`${inputBaseStyle} ${errors.name ? inputErrorStyle : inputNormalStyle}`} required aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
                    {errors.name && <p id="name-error" className="text-xs text-error mt-1">{errors.name}</p>}
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" name="email" id="email" value={newTrainee.email} onChange={handleInputChange} onBlur={handleBlur} className={`${inputBaseStyle} ${errors.email ? inputErrorStyle : inputNormalStyle}`} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
                    {errors.email && <p id="email-error" className="text-xs text-error mt-1">{errors.email}</p>}
                </div>
                 <div>
                    <label htmlFor="id" className="block text-sm font-medium text-gray-700">Trainee ID</label>
                    <input type="text" name="id" id="id" value={newTrainee.id} onChange={handleInputChange} className={`${inputBaseStyle} ${inputNormalStyle}`} />
                </div>
                <button type="submit" className="bg-success text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition duration-150 shadow-md h-10 disabled:bg-gray-400 disabled:cursor-not-allowed self-end">
                  Add Trainee
                </button>
              </div>
          </fieldset>
        </form>
        {errors.form && <p className="text-sm text-error font-medium mt-2">{errors.form}</p>}
      </div>

      <h3 className="text-xl font-bold text-cfm-dark mb-4">Existing Trainees ({Object.keys(trainees).length})</h3>
       <div className="overflow-x-auto bg-gray-50 rounded-xl shadow-inner">
         <table className="min-w-full divide-y divide-gray-200">
           <thead className="bg-cfm-light">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Email/ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Password</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
             <tbody className="bg-white divide-y divide-gray-100">
             {Object.keys(trainees).length === 0 ? (
                <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-500">No trainees created yet.</td>
                </tr>
              // FIX: Explicitly type 'details' to resolve property access errors.
             ) : Object.entries(trainees).map(([username, details]: [string, Trainee]) => (
                <tr key={username}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{username}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{details.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{details.email || details.id}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex items-center space-x-2">
                           <span className="font-mono">{visiblePasswords[username] ? details.password : '••••••••'}</span>
                           <button onClick={() => togglePasswordVisibility(username)} className="text-gray-500 hover:text-cfm-blue" aria-label={`Show password for ${username}`}>
                               <EyeIcon slashed={visiblePasswords[username]} />
                           </button>
                        </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        <button onClick={() => setTraineeToDelete(username)} className="text-error hover:text-red-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed" disabled={!isFirebaseReady}>Delete</button>
                    </td>
                </tr>
             ))}
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


const AdminSummary: React.FC<AdminSummaryProps> = ({ navigate, db, isFirebaseReady, trainees }) => {
  const [results, setResults] = useState<ExamRecord[]>([]);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [modalState, setModalState] = useState<ModalState | null>(null);

  useEffect(() => {
    if (!db || !isFirebaseReady) {
      setLoading(false); // Stop loading if no DB connection
      return;
    }
    
    setLoading(true);
    setFetchError(null);
    const unsubscribe = listenForResults(db, (fetchedResults) => {
      setResults(fetchedResults);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching Firestore results:", error);
      setFetchError("Could not load exam results. Please check your connection and refresh the page.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, isFirebaseReady]);

  const handleClearResults = async () => {
    if (!db) {
        console.error("Firestore not ready. Cannot delete.");
        return;
    }
    const count = await clearAllResults(db);
    setModalState({ title: "Success", message: `${count} records permanently deleted from Firestore.`, details: null });
    setShowClearConfirm(false);
  };

  const filteredAndSortedResults = useMemo(() => {
    let filtered = results.filter(r =>
      r.user.name.toLowerCase().includes(filterText.toLowerCase()) ||
      (r.user.email || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (r.user.id || '').toLowerCase().includes(filterText.toLowerCase())
    );

    filtered.sort((a, b) => {
      let valA: any, valB: any;
      if (sortBy === 'timestamp') {
        valA = new Date(a.timestamp).getTime();
        valB = new Date(b.timestamp).getTime();
      } else if (sortBy === 'totalscore') {
        valA = a.totalScore;
        valB = b.totalScore;
      } else if (sortBy === 'name') {
        valA = a.user.name.toLowerCase();
        valB = b.user.name.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [results, filterText, sortBy, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('desc');
    }
  };
  
  const renderSortIcon = (key: SortKey) => {
    if (sortBy !== key) return '↕';
    return sortDirection === 'asc' ? '▲' : '▼';
  };

  const handleExport = () => {
    if(filteredAndSortedResults.length === 0) {
        setModalState({ title: "Export Error", message: "No data to export.", isError: true });
    } else {
        exportCsv(filteredAndSortedResults);
        setModalState({ title: "Export Successful", message: `Exported ${filteredAndSortedResults.length} records to CSV.` });
    }
  };

  return (
    <div className="max-w-7xl mx-auto my-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border-t-8 border-cfm-dark">
        <h2 className="text-3xl font-bold text-cfm-dark mb-4">Admin Score Summary</h2>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
          <input
            type="text"
            placeholder="Filter by Name, Email, or ID..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-cfm-blue focus:border-cfm-blue"
          />
          <div className="flex space-x-3 w-full sm:w-auto">
            <button onClick={handleExport} className="flex-1 px-4 py-2 rounded-lg font-semibold text-white bg-success hover:bg-green-700 transition duration-150 shadow-md flex items-center justify-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
              <span>Export CSV ({filteredAndSortedResults.length})</span>
            </button>
            <button onClick={() => navigate('auth')} className="flex-1 px-4 py-2 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition duration-150 shadow-md">
              Back
            </button>
          </div>
        </div>
        
        {loading ? (
            <div className="text-center p-10 bg-gray-50 rounded-lg text-gray-500 font-medium flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-cfm-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Loading results from centralized database...</span>
            </div>
        ) : fetchError ? (
            <div className="text-center p-10 bg-red-50 text-error rounded-lg border border-error">
                <WarningIcon className="h-12 w-12 mx-auto mb-2" />
                <h3 className="font-bold text-lg mb-1">Failed to Load Data</h3>
                <p>{fetchError}</p>
            </div>
        ) : filteredAndSortedResults.length === 0 ? (
          <div className="text-center p-10 bg-gray-50 rounded-lg text-gray-500 font-medium">
            No exam results found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto bg-gray-50 rounded-xl shadow-inner">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-cfm-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider cursor-pointer hover:bg-cfm-blue/20" onClick={() => handleSort('name')}>Name {renderSortIcon('name')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Email/ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider cursor-pointer hover:bg-cfm-blue/20" onClick={() => handleSort('timestamp')}>Timestamp {renderSortIcon('timestamp')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider cursor-pointer hover:bg-cfm-blue/20" onClick={() => handleSort('totalscore')}>Score {renderSortIcon('totalscore')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-cfm-dark uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredAndSortedResults.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.user.name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{record.user.email || record.user.id}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(record.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-cfm-dark">
                        {record.totalScore} / {record.totalPossible} ({((record.totalScore / record.totalPossible) * 100).toFixed(1)}%)
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <button className="text-cfm-blue hover:text-cfm-dark font-medium" onClick={() => {
                           // Fix: Add explicit type for 'res' to resolve property access error on type 'unknown'.
                           const details: ModalDetails[] = Object.entries(record.moduleResults)
                                .map(([id, res]: [string, ModuleResult]) => {
                                    const module: Module | undefined = EXAM_DATA.modules.find(m => m.id === id);
                                    return { 
                                      title: module?.title || id, 
                                      score: res.score, 
                                      total: res.total,
                                      // Fix: Prevent division by zero when calculating percentage.
                                      percent: res.total > 0 ? ((res.score / res.total) * 100).toFixed(1) : '0.0'
                                    };
                                });
                            setModalState({
                                title: `Exam Details for ${record.user.name}`,
                                message: `Timestamp: ${new Date(record.timestamp).toLocaleString()}`,
                                detailTitle: "Module Scores",
                                details
                            });
                          }}>
                          View Modules
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <button onClick={() => setShowClearConfirm(true)} className="mt-6 px-4 py-2 rounded-lg font-semibold text-white bg-error hover:bg-red-700 transition duration-150 shadow-md text-sm">
                Clear All Results
            </button>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 mt-8 border-t-8 border-cfm-blue">
        <h2 className="text-3xl font-bold text-cfm-dark mb-4">Trainee Credential Management</h2>
        <TraineeManager trainees={trainees} db={db} isFirebaseReady={isFirebaseReady} setModalState={setModalState} />
      </div>

      {showClearConfirm && (
        <ActionModal isVisible={true} title="Confirm Deletion" message="WARNING: This will PERMANENTLY delete ALL exam results from the database. This action cannot be undone." onConfirm={handleClearResults} onCancel={() => setShowClearConfirm(false)} showCancel={true} />
      )}

      {modalState && (
        <ActionModal isVisible={true} title={modalState.title} message={modalState.message} detailTitle={modalState.detailTitle} details={modalState.details} onConfirm={() => setModalState(null)} showCancel={false} />
      )}
    </div>
  );
};

export default AdminSummary;
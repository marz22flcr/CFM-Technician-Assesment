

import React, { useState, useEffect, useMemo } from 'react';
// Fix: Import ModuleResult for type annotations.
// FIX: Import Trainee type to be used for explicit typing.
import { View, ExamRecord, SortKey, SortDirection, ModalState, FirestoreDB, Module, ModalDetails, ModuleResult, TraineeList } from '../types';
import { listenForResults, clearAllResults } from '../services/firebaseService';
import { exportCsv } from '../services/csvExporter';
import { EXAM_DATA } from '../constants';
import ActionModal from './ActionModal';
import TraineeManager from './TraineeManager';
import { WarningIcon } from './Icons';

interface AdminSummaryProps {
  navigate: (view: View) => void;
  db: FirestoreDB | null;
  isFirebaseReady: boolean;
  trainees: TraineeList;
}

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

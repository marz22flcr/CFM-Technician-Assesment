

import React, { useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Import EXAM_DATA to resolve reference error.
import { INITIAL_TRAINEES, USER_KEY, EXAM_DATA } from './constants';
import { View, User, ExamSession, ExamRecord, FirestoreDB, ModuleResult, TraineeList } from './types';
import { initializeFirebase, saveExamRecord, listenForTrainees, seedInitialTrainees } from './services/firebaseService';

import Header from './components/Header';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import ModuleRunner from './components/ModuleRunner';
import FinalReview from './components/FinalReview';
import AdminLogin from './components/AdminLogin';
import AdminSummary from './components/AdminSummary';

const loadUserSession = (): User | null => {
  try {
    const userSession = localStorage.getItem(USER_KEY);
    return userSession ? JSON.parse(userSession) : null;
  } catch (e) {
    console.error("Error loading user session:", e);
    return null;
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('auth');
  const [user, setUser] = useState<User | null>(loadUserSession());
  const [examSession, setExamSession] = useState<ExamSession>({
    currentModuleIndex: 0,
    answers: {},
    moduleResults: {},
    submittedModules: {},
  });
  const [finalRecord, setFinalRecord] = useState<ExamRecord | null>(null);
  const [trainees, setTrainees] = useState<TraineeList>({});

  const [db, setDb] = useState<FirestoreDB | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    initializeFirebase(setDb, setIsFirebaseReady);
  }, []);

  useEffect(() => {
    if (db && isFirebaseReady) {
      seedInitialTrainees(db, INITIAL_TRAINEES);
      
      const unsubscribe = listenForTrainees(db, (fetchedTrainees) => {
        setTrainees(fetchedTrainees);
      }, (error) => {
        console.error("Error fetching trainees:", error);
      });

      return () => unsubscribe();
    }
  }, [db, isFirebaseReady]);


  const modules = EXAM_DATA.modules;
  const totalPossible = useMemo(() => modules.reduce((sum, mod) => sum + mod.questions.length, 0), [modules]);

  const currentScore = useMemo(() => {
    // Fix: Explicitly type the accumulator in reduce to ensure correct type inference.
    return Object.values(examSession.moduleResults).reduce((sum: number, res: ModuleResult) => sum + res.score, 0);
  }, [examSession.moduleResults]);

  const overallProgress = useMemo(() => {
    const questionsAnswered = Object.keys(examSession.answers).length;
    return totalPossible > 0 ? questionsAnswered / totalPossible : 0;
  }, [examSession.answers, totalPossible]);

  const navigate = useCallback((newView: View, data: any = null) => {
    if (newView === 'lobby' && view === 'auth') {
      setExamSession({
        currentModuleIndex: 0,
        answers: {},
        moduleResults: {},
        submittedModules: {},
      });
      setFinalRecord(null);
    }
    
    if (newView === 'review' && data) {
      setFinalRecord(data as ExamRecord);
    }
    
    setView(newView);
  }, [view]);

  useEffect(() => {
    if (user?.name && view === 'auth') {
      setView('lobby');
    }
  }, [user, view]);

  const finalizeExam = useCallback(async (): Promise<ExamRecord> => {
    // FIX: Explicitly typed the arguments for the reduce function to resolve 'Type 'unknown' is not assignable to type 'number'' error.
    const finalTotalScore = Object.values(examSession.moduleResults).reduce((a: number, b: ModuleResult) => a + b.score, 0);
    // FIX: Explicitly typed the arguments for the reduce function to resolve 'Type 'unknown' is not assignable to type 'number'' error.
    const finalTotalPossible = Object.values(examSession.moduleResults).reduce((a: number, b: ModuleResult) => a + b.total, 0);
    
    const record: ExamRecord = {
      user: user!,
      timestamp: new Date().toISOString(),
      moduleResults: examSession.moduleResults,
      answers: examSession.answers,
      totalScore: finalTotalScore,
      totalPossible: finalTotalPossible
    };
    
    await saveExamRecord(db, isFirebaseReady, record);
    return record;
  }, [examSession, user, db, isFirebaseReady]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
    navigate('auth');
  }, [navigate]);

  const renderContent = () => {
    switch (view) {
      case 'auth':
        return <Auth setUser={setUser} navigate={navigate} trainees={trainees} />;
      case 'lobby':
        if (!user) {
            navigate('auth');
            return null;
        }
        return <Lobby modules={modules} navigate={navigate} user={user} onLogout={handleLogout} />;
      case 'exam':
        if (!user) {
            navigate('auth');
            return null;
        }
        return (
          <ModuleRunner
            modules={modules}
            examSession={examSession}
            setExamSession={setExamSession}
            finalizeExam={finalizeExam}
            navigate={navigate}
          />
        );
      case 'review':
        return <FinalReview examRecord={finalRecord} modules={modules} navigate={navigate} />;
      case 'admin-login':
        return <AdminLogin navigate={navigate} />;
      case 'admin':
        return <AdminSummary navigate={navigate} db={db} isFirebaseReady={isFirebaseReady} trainees={trainees} />;
      default:
        return <Auth setUser={setUser} navigate={navigate} trainees={trainees} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header
        user={user}
        totalPossible={totalPossible}
        currentScore={view === 'exam' ? currentScore : null}
        progress={view === 'exam' ? overallProgress : null}
      />
      <main className="pb-12">
        {renderContent()}
      </main>
      <footer className="w-full bg-cfm-dark text-white text-center py-4 text-sm font-light mt-10">
        &copy; {new Date().getFullYear()} CFM Training Institute Inc. Assessment System.
      </footer>
      {!isFirebaseReady && (view === 'admin' || (view === 'lobby' && user)) && (
         <div className="fixed bottom-0 left-0 right-0 bg-yellow-400 text-sm text-center py-1 font-medium">
             Initializing secure connection...
         </div>
      )}
    </div>
  );
};

export default App;
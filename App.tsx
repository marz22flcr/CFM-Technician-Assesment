import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { INITIAL_TRAINEES, USER_KEY, EXAM_DATA } from './constants';
import { View, User, ExamSession, ExamRecord, FirestoreDB, ModuleResult, TraineeList, ModalState, Module } from './types';
import { initializeFirebase, saveExamRecord, listenForTrainees, seedInitialTrainees, listenForUserResults } from './services/firebaseService';
import { startReviewChatSession } from './services/geminiService';

import Header from './components/Header';
import Auth from './components/Auth';
import Lobby from './components/Lobby';
import ModuleRunner from './components/ModuleRunner';
import FinalReview from './components/FinalReview';
import AdminLogin from './components/AdminLogin';
import AdminSummary from './components/AdminSummary';
import ActionModal from './components/ActionModal';
import Chatbot from './components/Chatbot';
import { WrenchIcon } from './components/Icons';

const EXAM_DURATION_SECONDS = 60 * 60; // 60 minutes
const EXAM_END_TIME_KEY = 'cfmti_exam_end_time';

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
  
  // State for exam history and review context
  const [userHistory, setUserHistory] = useState<ExamRecord[]>([]);
  const [isReviewingHistory, setIsReviewingHistory] = useState(false);
  const [moduleForReview, setModuleForReview] = useState<Module | null>(null);
  
  const [db, setDb] = useState<FirestoreDB | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [traineeFetchError, setTraineeFetchError] = useState(false);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const [examEndTime, setExamEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    initializeFirebase(setDb, setIsFirebaseReady, setFirebaseError);
  }, []);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    if (db && isFirebaseReady) {
        setTraineeFetchError(false);
        const setupTrainees = async () => {
            try {
                await seedInitialTrainees(db, INITIAL_TRAINEES);
                unsubscribe = listenForTrainees(
                    db,
                    (fetchedTrainees) => { setTrainees(fetchedTrainees); },
                    (error) => { 
                        console.error("Error fetching trainees:", error);
                        setTraineeFetchError(true);
                        setTrainees(INITIAL_TRAINEES);
                    }
                );
            } catch (error: any) {
                console.error("Caught error during trainee setup:", error);
                setTraineeFetchError(true);
                setTrainees(INITIAL_TRAINEES);
            }
        };
        setupTrainees();
    } else {
        setTrainees(INITIAL_TRAINEES);
    }
    return () => { unsubscribe(); };
  }, [db, isFirebaseReady]);

  useEffect(() => {
    let unsubscribe = () => {};
    if (user?.userId && db && isFirebaseReady) {
      unsubscribe = listenForUserResults(db, user.userId, setUserHistory, (err) => {
        console.error("Failed to fetch user history:", err);
        setUserHistory([]);
      });
    } else {
      setUserHistory([]);
    }
    return () => unsubscribe();
  }, [user, db, isFirebaseReady]);


  const modules = EXAM_DATA.modules;
  const totalPossible = useMemo(() => modules.reduce((sum, mod) => sum + mod.questions.length, 0), [modules]);

  const currentScore = useMemo(() => {
    return Object.values(examSession.moduleResults).reduce((sum: number, res: ModuleResult) => sum + res.score, 0);
  }, [examSession.moduleResults]);

  const overallProgress = useMemo(() => {
    const questionsAnswered = Object.keys(examSession.answers).length;
    return totalPossible > 0 ? questionsAnswered / totalPossible : 0;
  }, [examSession.answers, totalPossible]);

  const clearTimer = useCallback(() => {
    localStorage.removeItem(EXAM_END_TIME_KEY);
    setExamEndTime(null);
    setTimeLeft(null);
  }, []);
  
  const navigate = useCallback((newView: View, data: any = null) => {
    if (view === 'review' && newView !== 'review') {
        setIsReviewingHistory(false);
    }

    if (newView === 'lobby' && view === 'auth') {
      setExamSession({
        currentModuleIndex: 0,
        answers: {},
        moduleResults: {},
        submittedModules: {},
      });
      setFinalRecord(null);
      clearTimer(); // Ensure timer is cleared on new session
    }

    if (newView === 'lobby' && view === 'reviewer') {
      setModuleForReview(null);
    }
    
    if (newView === 'exam' && !examEndTime) { // Only start timer if not already running
        const endTime = Date.now() + EXAM_DURATION_SECONDS * 1000;
        localStorage.setItem(EXAM_END_TIME_KEY, endTime.toString());
        setExamEndTime(endTime);
    }
    
    if (newView === 'review' && data) {
      setFinalRecord(data as ExamRecord);
    }
    
    setView(newView);
  }, [view, examEndTime, clearTimer]);

  useEffect(() => {
    if (user?.name && view === 'auth') {
      setView('lobby');
    }
  }, [user, view]);

  const finalizeExam = useCallback(async (): Promise<ExamRecord> => {
    const finalTotalScore = (Object.values(examSession.moduleResults) as ModuleResult[]).reduce((a, b) => a + b.score, 0);
    const finalTotalPossible = (Object.values(examSession.moduleResults) as ModuleResult[]).reduce((a, b) => a + b.total, 0);
    
    const record: ExamRecord = {
      user: user!,
      // FIX: Corrected typo `new new Date()` to `new Date()`.
      timestamp: new Date().toISOString(),
      moduleResults: examSession.moduleResults,
      answers: examSession.answers,
      totalScore: finalTotalScore,
      totalPossible: finalTotalPossible
    };
    
    try {
        await saveExamRecord(db, isFirebaseReady, record);
    } catch(error) {
        console.error("Failed to save exam record:", error);
        setModalState({
            title: "Save Error",
            message: "Your exam results could not be saved to the database. You can review your results now, but they will be lost when you log out.",
            isError: true,
        });
    }

    clearTimer();
    setIsReviewingHistory(false);
    return record;
  }, [examSession, user, db, isFirebaseReady, clearTimer]);
  
  const handleAutoSubmit = useCallback(async () => {
    const finalRecord = await finalizeExam();
    navigate('review', finalRecord);
  }, [finalizeExam, navigate]);

  useEffect(() => {
    if (!examEndTime) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
        const remaining = Math.max(0, Math.round((examEndTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
            clearInterval(interval);
            handleAutoSubmit();
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [examEndTime, handleAutoSubmit]);

  useEffect(() => {
    const storedEndTime = localStorage.getItem(EXAM_END_TIME_KEY);
    if (storedEndTime) {
        const endTime = parseInt(storedEndTime, 10);
        if (endTime > Date.now()) {
            setExamEndTime(endTime);
        } else {
            // If timer has expired but we are not on the review screen, submit it.
            if(view !== 'review') {
              handleAutoSubmit();
            }
        }
    }
  }, [view, handleAutoSubmit]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    clearTimer();
    setUser(null);
    navigate('auth');
  }, [navigate, clearTimer]);

  const jumpToModule = useCallback((moduleIndex: number) => {
    setExamSession(prev => ({
      ...prev,
      currentModuleIndex: moduleIndex,
    }));
    navigate('exam');
  }, [navigate]);
  
  const viewHistoricalRecord = (record: ExamRecord) => {
    setFinalRecord(record);
    setIsReviewingHistory(true);
    navigate('review');
  };

  const handleStartReview = async (module: Module) => {
    setModuleForReview(module);
    try {
      setModalState({ title: "Initializing AI...", message: "Please wait while the AI prepares your review session." });
      await startReviewChatSession(module);
      setModalState(null);
      navigate('reviewer');
    } catch (error: any) {
      console.error("Failed to start review chat session:", error);
      setModalState({
        title: "AI Error",
        message: error.message || "Could not start the AI review session. Please try again.",
        isError: true,
      });
    }
  };
  
  const renderContent = () => {
    switch (view) {
      case 'auth':
        return <Auth setUser={setUser} navigate={navigate} trainees={trainees} db={db} isFirebaseReady={isFirebaseReady} />;
      case 'lobby':
        if (!user) {
            navigate('auth');
            return null;
        }
        return <Lobby modules={modules} navigate={navigate} user={user} onLogout={handleLogout} onJumpToModule={jumpToModule} userHistory={userHistory} onViewRecord={viewHistoricalRecord} onStartReview={handleStartReview} />;
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
            onStartReview={handleStartReview}
          />
        );
      case 'review':
        return <FinalReview examRecord={finalRecord} modules={modules} navigate={navigate} isReviewingHistory={isReviewingHistory} />;
      case 'admin-login':
        return <AdminLogin navigate={navigate} />;
      case 'admin':
        return <AdminSummary navigate={navigate} db={db} isFirebaseReady={isFirebaseReady} trainees={trainees} />;
      case 'reviewer':
        if (!moduleForReview) {
            navigate('lobby');
            return null;
        }
        return <Chatbot module={moduleForReview} onClose={() => navigate('lobby')} timeLeft={timeLeft} />;
      default:
        return <Auth setUser={setUser} navigate={navigate} trainees={trainees} db={db} isFirebaseReady={isFirebaseReady} />;
    }
  };
  
  const isOffline = !isFirebaseReady || traineeFetchError;
  
  const isSetupError = firebaseError && firebaseError.includes('SETUP REQUIRED');
  const isConfigError = firebaseError && firebaseError.startsWith('SETUP_CONFIG');

  const offlineMessage = firebaseError
    ? firebaseError
    : traineeFetchError
    ? "Error loading trainee data. Using local fallback. Results may not save correctly."
    : "Offline Mode: Database not connected. Results will not be saved.";


  const renderFirebaseError = (errorMessage: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = errorMessage.split(urlRegex);

    return (
      <>
        {parts.map((part, index) => {
          if (part.match(urlRegex)) {
            return (
              <a 
                key={index} 
                href={part} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold underline hover:text-black/80"
              >
                {part}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };
  
  const renderConfigSetupScreen = () => {
    const setupSteps = [
      "Go to the <a href='https://console.firebase.google.com/' target='_blank' rel='noopener noreferrer' class='font-bold underline'>Firebase Console</a> and click on your project (e.g., <strong>CFMTraining</strong>).",
      "In your Project Overview, click the <strong>Web icon (&lt;/&gt;)</strong> to add a web app.",
      "Give your app a nickname (e.g., 'CFM Assessment') and click <strong>'Register app'</strong>. You don't need to do the other setup steps on that page.",
      "Firebase will show you a block of code with a <code>firebaseConfig</code> object. Click the copy icon to copy the entire object.",
      "Open the <code>index.html</code> file in this project.",
      "Replace the placeholder <code>window.firebaseConfig</code> object with the one you just copied.",
    ];

    return (
        <div className="fixed inset-0 bg-cfm-light flex items-center justify-center z-50 p-4">
            <div className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center border-t-8 border-cfm-blue animate-fade-in">
                <WrenchIcon className="h-16 w-16 text-cfm-blue mx-auto mb-4" />
                <h2 className="text-3xl md:text-4xl font-extrabold text-cfm-dark">Connect Your Firebase Project</h2>
                <p className="text-gray-600 text-lg mt-2 mb-6">Let's get the configuration keys to link this app to your new project.</p>

                <div className="bg-gray-50 p-6 rounded-lg mt-6 shadow-inner text-left">
                    <h3 className="font-bold text-xl text-cfm-dark mb-4">Follow These 6 Steps:</h3>
                    <ol className="list-decimal list-inside space-y-4 text-gray-700">
                        {setupSteps.map((step, index) => (
                            <li key={index} className="flex items-start">
                                <span className="flex items-center justify-center bg-cfm-blue text-white rounded-full font-bold text-sm h-6 w-6 mr-3 flex-shrink-0 mt-0.5">{index + 1}</span>
                                <span dangerouslySetInnerHTML={{ __html: step }} />
                            </li>
                        ))}
                    </ol>
                </div>
                
                <div className="mt-8">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full md:w-auto inline-flex items-center justify-center bg-success text-white py-4 px-8 rounded-lg text-lg font-bold hover:bg-green-700 transition duration-150 shadow-lg"
                    >
                        I've Updated The Config, Refresh App!
                    </button>
                </div>
                 <p className="text-xs text-gray-400 mt-6">After you refresh, the app might guide you through one more step to create your database.</p>
            </div>
        </div>
    );
  };
  
  const renderSetupErrorScreen = (errorMessage: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = errorMessage.match(urlRegex);
    const url = match ? match[0] : null;

    const setupSteps = [
        "A new tab will open. In it, click the large blue **CREATE DATABASE** button.",
        "A side panel will appear. Choose **Native Mode** and click **NEXT**.",
        "Choose a location for your data (the default is fine) and click **ENABLE**.",
        "Wait for the database to be created. Once it's done, come back to this tab.",
    ];

    return (
        <div className="fixed inset-0 bg-cfm-light flex items-center justify-center z-50 p-4">
            <div className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center border-t-8 border-cfm-blue animate-fade-in">
                <WrenchIcon className="h-16 w-16 text-cfm-blue mx-auto mb-4" />
                <h2 className="text-3xl md:text-4xl font-extrabold text-cfm-dark">Final Setup Step</h2>
                <p className="text-gray-600 text-lg mt-2 mb-6">Let's create your cloud database to store exam results.</p>

                <div className="bg-gray-50 p-6 rounded-lg mt-6 shadow-inner text-left">
                    <h3 className="font-bold text-xl text-cfm-dark mb-4">Follow These 4 Steps:</h3>
                    <ol className="list-decimal list-inside space-y-4 text-gray-700">
                        {setupSteps.map((step, index) => (
                            <li key={index} className="flex items-start">
                                <span className="flex items-center justify-center bg-cfm-blue text-white rounded-full font-bold text-sm h-6 w-6 mr-3 flex-shrink-0 mt-0.5">{index + 1}</span>
                                <span dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-cfm-dark font-semibold">$1</strong>') }} />
                            </li>
                        ))}
                    </ol>
                </div>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {url && (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center text-center bg-cfm-blue text-white py-4 px-6 rounded-lg text-lg font-bold hover:bg-cfm-dark transition duration-150 shadow-lg"
                        >
                            Go to Google Cloud Setup
                        </a>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center justify-center bg-success text-white py-4 px-6 rounded-lg text-lg font-bold hover:bg-green-700 transition duration-150"
                    >
                        I've Done It, Refresh App!
                    </button>
                </div>
                 <p className="text-xs text-gray-400 mt-6">This is a one-time setup. You won't see this screen again after the database is created.</p>
            </div>
        </div>
    );
};
  
  if (isConfigError) {
      return renderConfigSetupScreen();
  }
  
  if (isSetupError && firebaseError) {
      return renderSetupErrorScreen(firebaseError);
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Header
        user={user}
        totalPossible={totalPossible}
        currentScore={view === 'exam' ? currentScore : null}
        progress={view === 'exam' ? overallProgress : null}
        timeLeft={timeLeft}
        onLogout={handleLogout}
      />
      <main className="pb-12">
        {renderContent()}
      </main>
      <footer className="w-full bg-cfm-dark text-white text-center py-4 text-sm font-light mt-10">
        &copy; {new Date().getFullYear()} CFM Training Institute Inc. Assessment System.
      </footer>
      {(isOffline || firebaseError) && !isSetupError && !isConfigError && (view === 'admin' || view === 'auth' || (view === 'lobby' && user)) && (
         <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 font-medium flex items-center justify-center text-center bg-yellow-400 text-black">
             <div className="text-sm">{renderFirebaseError(offlineMessage)}</div>
         </div>
      )}
      {modalState && (
        <ActionModal
          isVisible={true}
          title={modalState.title}
          message={modalState.message}
          onConfirm={() => setModalState(null)}
          showCancel={false}
        />
      )}
    </div>
  );
};

export default App;

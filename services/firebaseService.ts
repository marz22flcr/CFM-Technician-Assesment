
import { FirestoreDB, ExamRecord, TraineeList, Trainee } from '../types';

declare global {
  interface Window {
    firebase: any;
    firebaseConfig?: {
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      messagingSenderId: string;
      appId: string;
    };
  }
  namespace NodeJS {
    interface ProcessEnv {
      FIREBASE_API_KEY?: string;
      FIREBASE_AUTH_DOMAIN?: string;
      FIREBASE_PROJECT_ID?: string;
      FIREBASE_STORAGE_BUCKET?: string;
      FIREBASE_MESSAGING_SENDER_ID?: string;
      FIREBASE_APP_ID?: string;
    }
  }
}

const getEnv = () => {
  const firebaseConfig = window.firebaseConfig;
  
  return {
    appId: firebaseConfig?.projectId || 'default-app-id',
    firebaseConfig: firebaseConfig,
  };
};

const RESULTS_PATH = 'exam_results';
const TRAINEES_PATH = 'trainees';

export const initializeFirebase = (
  setDb: (db: FirestoreDB) => void,
  setIsFirebaseReady: (isReady: boolean) => void,
  setFirebaseError: (error: string | null) => void
) => {
  const { firebaseConfig } = getEnv();

  if (!firebaseConfig || Object.values(firebaseConfig).some(v => v.includes('REPLACE'))) {
    const errorMsg = "Firebase not configured. To enable database features, please update credentials in index.html.";
    console.info(errorMsg);
    setFirebaseError(errorMsg);
    setIsFirebaseReady(false);
    return;
  }

  const checkAndInitialize = () => {
    if (typeof window.firebase === 'undefined' || !window.firebase.firestore || !window.firebase.auth) {
      setTimeout(checkAndInitialize, 100);
      return;
    }
    
    let app;
    if (!window.firebase.apps.length) {
      app = window.firebase.initializeApp(firebaseConfig);
    } else {
      app = window.firebase.app();
    }
    
    const firestoreDb = window.firebase.firestore(app);
    const authInstance = window.firebase.auth(app);
    
    const dbInstance: FirestoreDB = {
      collection: (...path: string[]) => firestoreDb.collection(path.join('/')),
      doc: (...path: string[]) => firestoreDb.doc(path.join('/')),
    };

    authInstance.onAuthStateChanged((user: any) => {
      if (user) {
        setDb(dbInstance);
        setIsFirebaseReady(true);
        setFirebaseError(null);
      } else {
        setIsFirebaseReady(false);
      }
    });

    const authenticate = async () => {
      try {
        await authInstance.signInAnonymously();
      } catch (error: any) {
        let message: string;
        const errorMessage = String(error.message || '');
        const errorCode = String(error.code || '');
        
        if (errorCode === 'auth/operation-not-allowed') {
            message = "Anonymous sign-in is disabled. Please enable it in your Firebase project's Authentication settings to save results online.";
        } else if (errorMessage.includes('CONFIGURATION_NOT_FOUND')) {
            message = `Connection Failed: Invalid Firebase configuration. Please verify that the config values in index.html exactly match the "Web app" configuration in your Firebase project settings. Also ensure you have created a Firestore database.`;
        } else {
            message = `Could not connect to Firebase. Running in offline mode. (Error: ${errorCode || 'UNKNOWN'})`
        }
        
        setFirebaseError(message);
        console.warn(message, error);
      }
    };

    authenticate();
  };

  checkAndInitialize();
};

const getResultsCollection = (db: FirestoreDB) => {
    const { appId } = getEnv();
    return db.collection('artifacts', appId, 'public', 'data', RESULTS_PATH);
};

const getTraineesCollection = (db: FirestoreDB) => {
    const { appId } = getEnv();
    return db.collection('artifacts', appId, 'public', 'data', TRAINEES_PATH);
};

export const saveExamRecord = async (
  db: FirestoreDB | null,
  isFirebaseReady: boolean,
  record: ExamRecord
) => {
  if (!db || !isFirebaseReady) {
    console.warn("Offline Mode: Exam record not saved. Please configure Firebase to save results.", record);
    return;
  }
  
  try {
    const collectionRef = getResultsCollection(db);
    await collectionRef.add(record);
    console.log("Exam record successfully saved to Firestore.");
  } catch (e) {
    console.error("Error saving document to Firestore:", e);
    throw e;
  }
};

export const listenForResults = (
  db: FirestoreDB,
  onUpdate: (records: ExamRecord[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const collectionRef = getResultsCollection(db);
  const unsubscribe = collectionRef.onSnapshot((snapshot: any) => {
    const fetchedResults: ExamRecord[] = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    onUpdate(fetchedResults);
  }, onError);

  return unsubscribe;
};

export const clearAllResults = async (db: FirestoreDB): Promise<number> => {
    const collectionRef = getResultsCollection(db);
    try {
        const snapshot = await collectionRef.get();
        if (snapshot.empty) {
            return 0;
        }

        const deletePromises: Promise<void>[] = [];
        snapshot.docs.forEach((doc: any) => {
            deletePromises.push(doc.ref.delete());
        });

        await Promise.all(deletePromises);
        return snapshot.size;
    } catch (e) {
        console.error("Error deleting documents:", e);
        return 0;
    }
};

export const listenForTrainees = (
  db: FirestoreDB,
  onUpdate: (trainees: TraineeList) => void,
  onError: (error: Error) => void
): (() => void) => {
  const collectionRef = getTraineesCollection(db);
  const unsubscribe = collectionRef.onSnapshot((snapshot: any) => {
    const fetchedTrainees: TraineeList = {};
    snapshot.docs.forEach((doc: any) => {
      fetchedTrainees[doc.id] = doc.data() as Trainee;
    });
    onUpdate(fetchedTrainees);
  }, onError);

  return unsubscribe;
};

export const addTrainee = async (
  db: FirestoreDB | null,
  username: string,
  traineeData: Trainee
) => {
  if (!db) {
    console.warn(`Offline Mode: Trainee '${username}' not added. Please configure Firebase.`);
    return;
  }
  try {
    const docRef = getTraineesCollection(db).doc(username);
    await docRef.set(traineeData);
    console.log("Trainee successfully added to Firestore.");
  } catch (e) {
    console.error("Error adding trainee to Firestore:", e);
    throw e;
  }
};

export const deleteTrainee = async (
  db: FirestoreDB | null,
  username: string
) => {
  if (!db) {
    console.warn(`Offline Mode: Trainee '${username}' not deleted. Please configure Firebase.`);
    return;
  }
  try {
    const docRef = getTraineesCollection(db).doc(username);
    await docRef.delete();
    console.log("Trainee successfully deleted from Firestore.");
  } catch (e) {
    console.error("Error deleting trainee from Firestore:", e);
    throw e;
  }
};

export const seedInitialTrainees = async (db: FirestoreDB, initialTrainees: TraineeList) => {
    const collectionRef = getTraineesCollection(db);
    try {
        const firstTraineeUsername = Object.keys(initialTrainees)[0];
        if (!firstTraineeUsername) {
            return; // No initial trainees to seed
        }
        const docRef = collectionRef.doc(firstTraineeUsername);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.log("Initial trainee data not found. Seeding initial data...");
            const seedPromises = Object.entries(initialTrainees).map(([username, traineeData]) => {
                return collectionRef.doc(username).set(traineeData);
            });
            await Promise.all(seedPromises);
            console.log("Initial trainees seeded successfully.");
        }
    } catch (e) {
        console.error("Error seeding trainees:", e);
    }
};

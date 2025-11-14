
import { FirestoreDB, ExamRecord, TraineeList, Trainee } from '../types';

declare global {
  interface Window {
    firebase: any;
    __app_id?: string;
    __firebase_config?: string;
    __initial_auth_token?: string;
  }
}

const getEnv = () => ({
  appId: typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id',
  firebaseConfig: typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : null,
  initialAuthToken: typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null,
});

const RESULTS_PATH = 'exam_results';
const TRAINEES_PATH = 'trainees';

export const initializeFirebase = (
  setDb: (db: FirestoreDB) => void,
  setIsFirebaseReady: (isReady: boolean) => void
) => {
  const { firebaseConfig, initialAuthToken } = getEnv();

  if (!firebaseConfig) {
    console.error("Firebase configuration is missing.");
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
      } else {
        setIsFirebaseReady(false);
      }
    });

    const authenticate = async () => {
      try {
        if (initialAuthToken) {
          await authInstance.signInWithCustomToken(initialAuthToken);
        } else {
          await authInstance.signInAnonymously();
        }
      } catch (error) {
        console.error("Firebase authentication failed, falling back to anonymous:", error);
        await authInstance.signInAnonymously();
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
    console.error("Firestore not ready. Cannot save result.");
    return;
  }
  
  try {
    const collectionRef = getResultsCollection(db);
    await collectionRef.add(record);
    console.log("Exam record successfully saved to Firestore.");
  } catch (e) {
    console.error("Error saving document to Firestore:", e);
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
  db: FirestoreDB,
  username: string,
  traineeData: Trainee
) => {
  if (!db) {
    console.error("Firestore not ready. Cannot add trainee.");
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
  db: FirestoreDB,
  username: string
) => {
  if (!db) {
    console.error("Firestore not ready. Cannot delete trainee.");
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

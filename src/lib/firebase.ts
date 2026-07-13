import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId if provided
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

// Initialize Auth
export const auth = getAuth(app);

// Error Handling Infrastructure as mandated by Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore on initial boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Helper to save questions to Firestore
export async function saveQuestionsToFirestore(questions: any[]) {
  const path = "config/survey_questions";
  try {
    const qDocRef = doc(db, "config", "survey_questions");
    const sanitizedQuestions = JSON.parse(JSON.stringify(questions));
    await setDoc(qDocRef, { questions: sanitizedQuestions, updatedAt: new Date().toISOString() });
    return true;
  } catch (error: any) {
    if (error.code === "permission-denied" || error.message?.includes("permissions")) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    console.error("Error saving questions to Firestore:", error);
    return false;
  }
}

// Helper to load questions from Firestore
export async function getQuestionsFromFirestore() {
  const path = "config/survey_questions";
  try {
    const qDocRef = doc(db, "config", "survey_questions");
    const docSnap = await getDoc(qDocRef);
    if (docSnap.exists()) {
      return docSnap.data().questions || null;
    }
  } catch (error: any) {
    if (error.code === "permission-denied" || error.message?.includes("permissions")) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    console.error("Error loading questions from Firestore:", error);
  }
  return null;
}

// Helper to save webhook to Firestore
export async function saveWebhookToFirestore(webhookUrl: string) {
  const path = "config/webhook";
  try {
    const wDocRef = doc(db, "config", "webhook");
    await setDoc(wDocRef, { webhookUrl, updatedAt: new Date().toISOString() });
    return true;
  } catch (error: any) {
    if (error.code === "permission-denied" || error.message?.includes("permissions")) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    console.error("Error saving webhook to Firestore:", error);
    return false;
  }
}

// Helper to get webhook from Firestore
export async function getWebhookFromFirestore() {
  const path = "config/webhook";
  try {
    const wDocRef = doc(db, "config", "webhook");
    const docSnap = await getDoc(wDocRef);
    if (docSnap.exists()) {
      return docSnap.data().webhookUrl || "";
    }
  } catch (error: any) {
    if (error.code === "permission-denied" || error.message?.includes("permissions")) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    console.error("Error loading webhook from Firestore:", error);
  }
  return "";
}

// Helper to save response to Firestore
export async function saveResponseToFirestore(userName: string, answers: any) {
  const path = "responses";
  try {
    const responseCollection = collection(db, "responses");
    const sanitizedAnswers = JSON.parse(JSON.stringify(answers));
    const docRef = await addDoc(responseCollection, {
      userName,
      answers: sanitizedAnswers,
      timestamp: new Date().toISOString()
    });
    return docRef.id;
  } catch (error: any) {
    if (error.code === "permission-denied" || error.message?.includes("permissions")) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    console.error("Error saving response to Firestore:", error);
    throw error;
  }
}

// Helper to get all responses from Firestore
export async function getResponsesFromFirestore() {
  const path = "responses";
  try {
    const responseCollection = collection(db, "responses");
    const q = query(responseCollection, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const responses: any[] = [];
    querySnapshot.forEach((doc) => {
      responses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return responses;
  } catch (error: any) {
    if (error.code === "permission-denied" || error.message?.includes("permissions")) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    console.error("Error loading responses from Firestore:", error);
    // Try without ordering if index is not ready yet
    try {
      const responseCollection = collection(db, "responses");
      const querySnapshot = await getDocs(responseCollection);
      const responses: any[] = [];
      querySnapshot.forEach((doc) => {
        responses.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return responses;
    } catch (innerError: any) {
      if (innerError.code === "permission-denied" || innerError.message?.includes("permissions")) {
        handleFirestoreError(innerError, OperationType.LIST, path);
      }
      console.error("Fallback load responses failed:", innerError);
      return [];
    }
  }
}

// Helper to clear all responses from Firestore
export async function clearResponsesFromFirestore() {
  const path = "responses";
  try {
    const responseCollection = collection(db, "responses");
    const querySnapshot = await getDocs(responseCollection);
    const deletePromises = querySnapshot.docs.map(doc => {
      try {
        return deleteDoc(doc.ref);
      } catch (err: any) {
        if (err.code === "permission-denied" || err.message?.includes("permissions")) {
          handleFirestoreError(err, OperationType.DELETE, `responses/${doc.id}`);
        }
        throw err;
      }
    });
    await Promise.all(deletePromises);
    return true;
  } catch (error: any) {
    if (error.code === "permission-denied" || error.message?.includes("permissions")) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    console.error("Error clearing responses from Firestore:", error);
    return false;
  }
}

// Helper to save general settings to Firestore
export async function saveSettingsToFirestore(allowAnonymous: boolean, companyName?: string) {
  const path = "config/survey_settings";
  try {
    const sDocRef = doc(db, "config", "survey_settings");
    await setDoc(sDocRef, { 
      allowAnonymous, 
      companyName: companyName || "GROUP ULEP S.A.S", 
      updatedAt: new Date().toISOString() 
    });
    return true;
  } catch (error: any) {
    if (error.code === "permission-denied" || error.message?.includes("permissions")) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    console.error("Error saving settings to Firestore:", error);
    return false;
  }
}

// Helper to load general settings from Firestore
export async function getSettingsFromFirestore() {
  const path = "config/survey_settings";
  try {
    const sDocRef = doc(db, "config", "survey_settings");
    const docSnap = await getDoc(sDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        allowAnonymous: data.allowAnonymous !== false,
        companyName: data.companyName || "GROUP ULEP S.A.S"
      };
    }
  } catch (error: any) {
    if (error.code === "permission-denied" || error.message?.includes("permissions")) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    console.error("Error loading settings from Firestore:", error);
  }
  return { allowAnonymous: true, companyName: "GROUP ULEP S.A.S" }; // default fallback
}



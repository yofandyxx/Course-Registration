// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJ3wI-a0oewZdTULPVZlS3Y8fgVmREONc",
  authDomain: "ppnpcourseregistration-fe267.firebaseapp.com",
  projectId: "ppnpcourseregistration-fe267",
  storageBucket: "ppnpcourseregistration-fe267.firebasestorage.app",
  messagingSenderId: "445380297350",
  appId: "1:445380297350:web:01fc5b98c4a4add4c50707"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the shared Firebase services used by the auth context and repositories.
// Keeping a single instance prevents listeners and writes from targeting
// different Firebase app instances during Fast Refresh.
export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };

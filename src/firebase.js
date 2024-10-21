import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDA7X9UxtksYWKbbNf-yon7Ti5AzOu7u8g",
    authDomain: "seocontentgenerate-548d2.firebaseapp.com",
    projectId: "seocontentgenerate-548d2",
    storageBucket: "seocontentgenerate-548d2.appspot.com",
    messagingSenderId: "808565919849",
    appId: "1:808565919849:web:04c0f5a3cb66a25001d2f8",
    measurementId: "G-N7JRVGXL0X"
  };
  
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
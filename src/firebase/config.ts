import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBDADQfORxopXkKHeSFX-8cJbFkL11x7q0',
  authDomain: 'housie-155ea.firebaseapp.com',
  databaseURL: 'https://housie-155ea-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'housie-155ea',
  storageBucket: 'housie-155ea.firebasestorage.app',
  messagingSenderId: '753419854004',
  appId: '1:753419854004:web:8bfbb0b63428872bdfb7e1',
  measurementId: 'G-CPWP2MGZQS',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

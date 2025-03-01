import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC292pC6w-yeqs4mO1rOWlErcH8xBiHgFw",
  authDomain: "ngl0-2628e.firebaseapp.com",
  projectId: "ngl0-2628e",
  storageBucket: "ngl0-2628e.appspot.com",
  messagingSenderId: "267569069417",
  appId: "1:267569069417:web:acb813036a3371196291f8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchData() {
  const querySnapshot = await getDocs(collection(db, "messages"));
  const tableBody = document.getElementById("tableBody");

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const row = `
      <tr>
        <td>${doc.id}</td>
        <td>${data.message}</td>
        <td>${data.timestamp?.toDate().toLocaleString()}</td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
}

fetchData().catch(console.error);

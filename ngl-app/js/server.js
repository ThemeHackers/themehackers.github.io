import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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
const tableBody = document.getElementById("tableBody");
const messagesCollection = collection(db, "messages");

async function fetchData() {
  const querySnapshot = await getDocs(messagesCollection);
  tableBody.innerHTML = ""; 
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    let timestamp = data.timestamp;
    if (timestamp instanceof Timestamp) {
      timestamp = timestamp.toDate().toLocaleString();
    } else {
      timestamp = new Date(timestamp).toLocaleString();
    }
    const row = `
                    <tr>
                        <td>${doc.id}</td>
                        <td>${data.message}</td>
                        <td>${timestamp}</td>
                    </tr>`;
    tableBody.innerHTML += row;
  });
}

fetchData();

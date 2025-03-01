import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC292pC6w-yeqs4mO1rOWlErcH8xBiHgFw",
    authDomain: "ngl0-2628e.firebaseapp.com",
    projectId: "ngl0-2628e",
    storageBucket: "ngl0-2628e.appspot.com",
    messagingSenderId: "267569069417",
    appId: "1:267569069417:web:acb813036a3371196291f8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function encryptMessage(message) {
    return btoa(unescape(encodeURIComponent(message)));
}

function decryptMessage(encryptedMessage) {
    return decodeURIComponent(escape(atob(encryptedMessage)));
}

document.getElementById("sendBtn").addEventListener("click", async () => {
    const message = document.getElementById('message').value.trim();
    if (message.length === 0) {
        alert('Please enter a message!');
        return;
    }
    if (message.length > 1000) {
        alert('Message cannot exceed 1000 characters!');
        return;
    }
    document.getElementById('messages').innerHTML += `<li>${message}</li>`;
    document.getElementById('message').value = ''; 
    const encryptedMessage = encryptMessage(message);
    const decryptedMessage = decryptMessage(encryptedMessage);
    try {
        await addDoc(collection(db, "messages"), {
            message: decryptedMessage,
            timestamp: serverTimestamp()
        });
        document.getElementById("message").value = "";
        loadMessages();
    } catch (error) {
    }
});
document.getElementById('message').addEventListener('input', () => {
    document.getElementById('charCount').textContent = document.getElementById('message').value.length;
});

async function loadMessages() {
    const messagesList = document.getElementById("messages");
    messagesList.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "messages"));
    querySnapshot.forEach((doc) => {
        const decryptedMessage = decryptMessage(doc.data().message);
        const li = document.createElement("li");
        li.textContent = decryptedMessage;
        messagesList.appendChild(li);
    });
}

window.onload = loadMessages;
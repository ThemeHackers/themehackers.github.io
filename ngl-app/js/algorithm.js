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
let secretKey;

async function generateKey() {
    const keyMaterial = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("!@#$%^&*()_+ngl0"));
    secretKey = await crypto.subtle.importKey(
        "raw",
        keyMaterial,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

window.onload = async () => {
    await generateKey();
    await loadMessages();
};

async function encryptMessage(message) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        secretKey,
        new TextEncoder().encode(message)
    );
    return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`;
}

async function decryptMessage(encryptedMessage) {
    const [ivBase64, encryptedBase64] = encryptedMessage.split(".");
    const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));
    const encrypted = new Uint8Array(atob(encryptedBase64).split("").map(c => c.charCodeAt(0)));
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        secretKey,
        encrypted
    );
    return new TextDecoder().decode(decrypted);
}

async function loadMessages() {
    const messagesList = document.getElementById("messages");
    messagesList.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "messages"));
    querySnapshot.forEach(async (doc) => {
        const decryptedMessage = await decryptMessage(doc.data().message);
        const li = document.createElement("li");
        li.textContent = decryptedMessage;
        messagesList.appendChild(li);
    });
}

document.getElementById("sendBtn").addEventListener("click", async () => {
    const message = document.getElementById("message").value.trim();
    if (!message) return alert("Please enter a message!");
    const encryptedMessage = await encryptMessage(message);
    await addDoc(collection(db, "messages"), { message: encryptedMessage, timestamp: serverTimestamp() });
    document.getElementById("message").value = "";
    document.getElementById("charCount").textContent = "0";
    await loadMessages();
});

document.getElementById("message").addEventListener("input", () => {
    document.getElementById("charCount").textContent = document.getElementById("message").value.length;
});
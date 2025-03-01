import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

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

async function loadData() {
    await generateKey();
    const tableBody = document.getElementById("tableBody");
    tableBody.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "messages"));
    querySnapshot.forEach(async (doc) => {
        const data = doc.data();
        const decryptedMessage = await decryptMessage(data.message);
        const row = `
            <tr>
                <td>${doc.id}</td>
                <td>${decryptedMessage}</td>
                <td>${data.timestamp?.toDate()?.toLocaleString()}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

window.onload = loadData;
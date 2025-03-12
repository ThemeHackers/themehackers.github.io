const faucetAddress = "0x108d51488E88D4EBADB35Ee6fF1dAA111746b218";
const abi = ["function claimTokens() public"];

let signer;
let provider;
let lastClaimTime = localStorage.getItem("lastClaimTime") || 0;
const claimCooldown = 60 * 60; 
let claimAttempts = localStorage.getItem("claimAttempts") || 0;
const maxAttempts = 5;
let countdownInterval;

async function connectWallet() {
    if (!window.ethereum) {
        showToast("🦊 Please install MetaMask!", "error");
        return;
    }

    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        signer = provider.getSigner();
        const walletAddress = await signer.getAddress();
        const network = await provider.getNetwork();

        if (network.chainId !== 17000) {
            showToast("❌ Please switch to Holesky Testnet!", "error");
            return;
        }

        localStorage.setItem("walletAddress", walletAddress);
        document.getElementById("walletAddress").innerText = `Connected: ${walletAddress}`;
        updateButtonStatus();
    } catch (error) {
        showToast(error.code === 4001 ? "❌ Connection rejected by user." : "❌ Connection failed.", "error");
    }
}

async function claimTokens() {
    if (!signer) {
        showToast("❌ Please connect your wallet first.", "error");
        return;
    }
    if (!navigator.onLine) {
        showToast("❌ No internet connection.", "error");
        return;
    }

    const today = new Date().toDateString();
    const lastAttemptDate = localStorage.getItem("lastAttemptDate");
    if (lastAttemptDate !== today) {
        claimAttempts = 0;
        localStorage.setItem("lastAttemptDate", today);
    }
    if (claimAttempts >= maxAttempts) {
        showToast("❌ Daily claim limit reached.", "error");
        return;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const nextClaimTime = parseInt(lastClaimTime) + claimCooldown;
    if (currentTime < nextClaimTime) {
        return;
    }

    try {
        document.getElementById("rainbowLoader").style.display = "block";
        const faucet = new ethers.Contract(faucetAddress, abi, signer);
        const gasEstimate = await faucet.estimateGas.claimTokens();
        const tx = await faucet.claimTokens({ gasLimit: gasEstimate.mul(120).div(100) });
        await tx.wait();

        lastClaimTime = currentTime;
        claimAttempts++;
        localStorage.setItem("lastClaimTime", lastClaimTime);
        localStorage.setItem("claimAttempts", claimAttempts);
        localStorage.setItem("lastAttemptDate", today);

        const etherscanUrl = `https://holesky.etherscan.io/tx/${tx.hash}`;
        showToast(`✅ Tokens claimed! <a href="${etherscanUrl}" target="_blank">View on Etherscan</a>`, "success");
        updateButtonStatus();
    } catch (error) {
        if (error.code === "INSUFFICIENT_FUNDS") {
            showToast("❌ Insufficient gas funds.", "error");
        } else if (error.code === "NETWORK_ERROR") {
            showToast("❌ Network error. Please try again.", "error");
        } else {
            showToast(`❌ Error: ${error.message}`, "error");
        }
    } finally {
        document.getElementById("rainbowLoader").style.display = "none";
    }
}

function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    document.getElementById("toastContainer").appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function updateButtonStatus() {
    const claimButton = document.getElementById("claimTokens");
    const requestButton = document.getElementById("requestTokens"); 

    function updateCountdown() {
        const currentTime = Math.floor(Date.now() / 1000);
        const nextClaimTime = parseInt(lastClaimTime) + claimCooldown;
        const timeLeft = nextClaimTime - currentTime;

        if (timeLeft > 0) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            claimButton.disabled = true;
            claimButton.innerText = `⏳ ${minutes}:${seconds.toString().padStart(2, '0')}`;
            requestButton.disabled = true; 
            const progress = (timeLeft / claimCooldown) * 100;
            claimButton.style.background = `linear-gradient(to right, #4caf50 ${100 - progress}%, #ccc ${100 - progress}%)`;
        } else {
            claimButton.disabled = false;
            claimButton.innerText = "💸 Get Tokens Now →";
            claimButton.style.background = "";
            requestButton.disabled = false;
            clearInterval(countdownInterval);
        }
    }

    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}


function restoreWalletConnection() {
    const savedWallet = localStorage.getItem("walletAddress");
    if (savedWallet) {
        document.getElementById("walletAddress").innerText = `🔗 Reconnecting: ${savedWallet}`;
        connectWallet();
    }
}

window.ethereum?.on("accountsChanged", async (accounts) => {
    if (accounts.length > 0) {
        document.getElementById("walletAddress").innerText = `Connected: ${accounts[0]}`;
        localStorage.setItem("walletAddress", accounts[0]);
        updateButtonStatus();
    } else {
        document.getElementById("walletAddress").innerText = "Wallet disconnected";
        localStorage.removeItem("walletAddress");
    }
});

window.ethereum?.on("chainChanged", async (chainId) => {
    if (chainId !== '0x42') {
        showToast("❌ Wrong network. Switch to Holesky Testnet.", "error");
    } else {
        document.getElementById("walletAddress").innerText = "Connected to Holesky Testnet";
    }
});

window.addEventListener("unload", () => {
    if (countdownInterval) clearInterval(countdownInterval);
    window.ethereum?.removeAllListeners();
});

document.getElementById("connectWallet").addEventListener("click", connectWallet);
document.getElementById("claimTokens").addEventListener("click", claimTokens);
document.getElementById("requestTokens").addEventListener("click", claimTokens);
restoreWalletConnection();
updateButtonStatus();

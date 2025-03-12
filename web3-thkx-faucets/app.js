const faucetAddress = "0x1Fa74Cc546e0DAE4557F65e717a11694e462eCC3";
const abi = ["function claimTokens() public"];

let signer;
let provider;
let lastClaimTime = localStorage.getItem("lastClaimTime") || 0;
const claimCooldown = 60 * 60;
let countdownInterval;

async function connectWallet() {
    if (!window.ethereum) {
        document.getElementById("walletAddress").innerText = "🦊 Please install MetaMask!";
        return;
    }

    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        signer = provider.getSigner();
        const walletAddress = await signer.getAddress();
        const network = await provider.getNetwork();

        if (network.chainId !== 17000) {
            document.getElementById("walletAddress").innerText = "❌ Please switch to Holesky Testnet!";
            return;
        }

        localStorage.setItem("walletAddress", walletAddress);
        document.getElementById("walletAddress").innerText = `Connected: ${walletAddress}`;

        updateButtonStatus();
    } catch (error) {
        document.getElementById("walletAddress").innerText =
            error.code === 4001 ? "❌ Connection rejected by user." : "❌ Connection failed.";
    }
}

async function claimTokens() {
    if (!signer) {
        document.getElementById("walletAddress").innerText = "❌ Please connect your wallet first.";
        return;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const nextClaimTime = parseInt(lastClaimTime) + claimCooldown;

    if (currentTime < nextClaimTime) {
        return;
    }

    try {
        document.getElementById("walletAddress").innerText = "⏳ Claiming tokens...";
        document.getElementById("rainbowLoader").style.display = "block";

        const faucet = new ethers.Contract(faucetAddress, abi, signer);
        const tx = await faucet.claimTokens();
        await tx.wait();

        lastClaimTime = Math.floor(Date.now() / 1000);
        localStorage.setItem("lastClaimTime", lastClaimTime);

        const etherscanUrl = `https://holesky.etherscan.io/tx/${tx.hash}`;
        document.getElementById("walletAddress").innerHTML = `✅ Tokens claimed! <a href="${etherscanUrl}" target="_blank">View on Etherscan</a>`;

        updateButtonStatus();
    } catch (error) {
        document.getElementById("walletAddress").innerText = "❌ Transaction failed.";
    } finally {
        document.getElementById("rainbowLoader").style.display = "none";
    }
}

function updateButtonStatus() {
    const claimButton = document.getElementById("claimTokens");

    function updateCountdown() {
        const currentTime = Math.floor(Date.now() / 1000);
        const nextClaimTime = parseInt(lastClaimTime) + claimCooldown;
        const timeLeft = nextClaimTime - currentTime;

        if (timeLeft > 0) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            claimButton.disabled = true;
            claimButton.innerText = `💸 Claim available in ${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            claimButton.disabled = false;
            claimButton.innerText = "💸 Get Tokens Now →";
            clearInterval(countdownInterval);
        }
    }

    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

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
        document.getElementById("claimTokens").disabled = true;
        localStorage.removeItem("walletAddress");
    }
});

window.ethereum?.on("chainChanged", async (chainId) => {
    if (chainId !== '0x42') {
        document.getElementById("walletAddress").innerText = "❌ Wrong network. Switch to Holesky Testnet.";
        document.getElementById("claimTokens").disabled = true;
    } else {
        document.getElementById("walletAddress").innerText = "Connected to Holesky Testnet";
    }
});

document.getElementById("connectWallet").addEventListener("click", connectWallet);
document.getElementById("claimTokens").addEventListener("click", claimTokens);

restoreWalletConnection();
updateButtonStatus();

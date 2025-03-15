const faucetAddress = "0xF1ff652adBCFec1D5cfa3c5D2784f8536D17D2e9";
const abi = ["function claimTokens() public"];

let signer;
let provider;
let accounts = [];
let selectedAccount;
let lastClaimTime = localStorage.getItem("lastClaimTime") || 0;
const claimCooldown =  60 * 60;
let claimAttempts = parseInt(localStorage.getItem("claimAttempts")) || 0;
const maxAttempts = 10;
let countdownInterval;

async function connectWallet() {
    if (!window.ethereum) {
        showToast("🦊 Please install MetaMask!", "error");
        return;
    }

    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        if (accounts.length === 0) {
            return;
        }
        
        selectedAccount = accounts[0];
        console.log("Selected Account:", selectedAccount);
        signer = provider.getSigner(selectedAccount);
        if (!signer) {
            console.log("Signer is not set");
            return;
        }
        console.log("Signer:", signer);

        
        document.getElementById("walletAddress").innerText = `Connected: ${selectedAccount}`;
        localStorage.setItem("walletAddress", selectedAccount);
        
       
        const accountSelect = document.getElementById("accountSelect");
        if (accountSelect) {
            updateAccountSelection();
        }
        
        updateButtonStatus();
    } catch (error) {
        console.error("Connection error:", error);
        showToast(error.code === 4001 ? "❌ Connection rejected by user." : "❌ Connection failed.", "error");
    }
}

function updateAccountSelection() {
    const accountSelect = document.getElementById("accountSelect");
    if (!accountSelect) return;
    

    accountSelect.innerHTML = "";
    

    accounts.forEach(acc => {
        const option = document.createElement("option");
        option.value = acc;
        option.textContent = acc;
        accountSelect.appendChild(option);
    });
    
   
    accountSelect.style.display = accounts.length > 0 ? "block" : "none";

    accountSelect.value = selectedAccount;
    

    const oldSelect = accountSelect;
    const newSelect = oldSelect.cloneNode(true);
    oldSelect.parentNode.replaceChild(newSelect, oldSelect);
    newSelect.addEventListener("change", changeAccount);
}

function changeAccount(event) {
    selectedAccount = event.target.value;
    
    if (provider) {
        signer = provider.getSigner(selectedAccount);
    }
    
    document.getElementById("walletAddress").innerText = `Connected: ${selectedAccount}`;
    localStorage.setItem("walletAddress", selectedAccount);
    updateButtonStatus();
}

async function claimTokens() {
    console.log("Claim Tokens function called");
    if (!signer) {
        showToast("❌ Please connect your wallet first.", "error");
        return;
    }
    console.log("Signer is valid:", signer);
    if (!navigator.onLine) {
        showToast("❌ No internet connection.", "error");
        return;
    }
    console.log("Navigator is valid:", navigator);
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
        showToast(`⏳ Please wait before claiming again.`, "error");
        return;
    }

    try {
        const rainbowLoader = document.getElementById("rainbowLoader");
        console.log("Rainbow loader visibility:", rainbowLoader.style.display);
        if (rainbowLoader) {
            rainbowLoader.style.display = "block";
        }
        
        const faucet = new ethers.Contract(faucetAddress, abi, signer);
        console.log("Faucet contract:", faucet);    
        const gasEstimate = await faucet.estimateGas.claimTokens();
        console.log("Gas Estimate:", gasEstimate.toString());

        const tx = await faucet.claimTokens({ gasLimit: gasEstimate.mul(120).div(100) });
        console.log("Transaction sent:", tx);
        
        await tx.wait();
        console.log("Transaction mined:", tx);

        showEtherscanMessage(tx.hash);
        showToast("✅ Transaction Successful!", "success");
        lastClaimTime = currentTime;
        claimAttempts++;
        
        localStorage.setItem("lastClaimTime", lastClaimTime);
        localStorage.setItem("claimAttempts", claimAttempts);
        localStorage.setItem("lastAttemptDate", today);

        showToast(`✅ Tokens claimed!`);
        
        updateButtonStatus();
    } catch (error) {
        console.error("Claim error:", error);
        showToast(`❌ Error: ${error.message || "Unknown error"}`, "error");
    
        if (error.code === "INSUFFICIENT_FUNDS") {
            showToast("❌ Insufficient gas funds.", "error");
        } else if (error.code === "NETWORK_ERROR") {
            showToast("❌ Network error. Please try again.", "error");
        } else if (error.code == "ACTION_REJECTED") {
            showToast("❌ User Rejected Transaction.", "error");   
        }
        else if (error.code === -32001) {
  
            showToast("❌ Gas limit too low. Please increase gas limit.", "error");
        } else if (error.code === -32602) {

            showToast("❌ Invalid parameters provided. Please check your inputs.", "error");
        } else if (error.code === -32603) {

            showToast("❌ Internal error. Please try again later.", "error");
        } else if (error.code === 10000) {
   
            showToast("❌ Unsupported network. Please switch to a supported network.", "error");
        } 
        else {
            showToast(`❌ Error: ${error.message || "Unknown error"}`, "error");
        }
    } finally {
        const rainbowLoader = document.getElementById("rainbowLoader");
        if (rainbowLoader) {
            rainbowLoader.style.display = "none";
        }
    }
}

function showToast(message) {
    console.log("Toast message:", message);
    const toastMessage = document.getElementById("claimMessage");
    if (!toastMessage) {
        console.error("Toast container not found");
        return;
    }
    
    toastMessage.textContent = message;  
    toastMessage.style.display = "block"; 
    

    setTimeout(() => {
        toastMessage.style.display = "none";  
    }, 5000);
}
function showEtherscanMessage(txHash) {
    console.log("Transaction hash:", txHash);
    const etherscanMessage = document.getElementById("etherscan");

    if (!etherscanMessage) {
        console.error("Etherscan container not found");
        return;
    }

    const etherscanUrl = `https://holesky.etherscan.io/tx/${txHash}`;
    etherscanMessage.innerHTML = `✅ Transaction successful! <a href="${etherscanUrl}" target="_blank">View on Etherscan</a>`;
    
    etherscanMessage.style.display = "block"; 
    setTimeout(() => {
        etherscanMessage.style.display = "none"; 
    }, 5000);
}


function updateButtonStatus() {
    console.log("Updating button status...");
    const claimButton = document.getElementById("claimTokens");
    const requestButton = document.getElementById("requestTokens"); 

    console.log("Claim button text:", claimButton.innerText);

    if (!claimButton && !requestButton) {
        console.error("Buttons not found");
        return;
    }

    function updateCountdown() {
        const currentTime = Math.floor(Date.now() / 1000);
        const nextClaimTime = parseInt(lastClaimTime) + claimCooldown;
        const timeLeft = nextClaimTime - currentTime;

        if (timeLeft > 0) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            if (claimButton) {
                claimButton.disabled = true;
                claimButton.innerText = `⏳ ${minutes}:${seconds.toString().padStart(2, '0')}`;
                const progress = (timeLeft / claimCooldown) * 100;
                claimButton.style.background = `linear-gradient(to right, #4caf50 ${100 - progress}%, #ccc ${100 - progress}%)`;
            }
            
            if (requestButton) {
                requestButton.disabled = true; 
            }
        } else {
            if (claimButton) {
                claimButton.disabled = false;
                claimButton.innerText = "💸 Get Tokens Now →";
                claimButton.style.background = "";
            }
            
            if (requestButton) {
                requestButton.disabled = false;
            }
            
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
        const walletAddress = document.getElementById("walletAddress");
        if (walletAddress) {
            walletAddress.innerText = `🔗 Reconnecting: ${savedWallet}`;
        }
        connectWallet();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById("connectWallet");
    const claimButton = document.getElementById("claimTokens");
    const requestButton = document.getElementById("requestTokens");
    
    if (connectButton) {
        connectButton.addEventListener("click", connectWallet);
    }

    if (claimButton) {
        claimButton.addEventListener("click", claimTokens);
    }

    if (requestButton) {
        requestButton.addEventListener("click", claimTokens);
    }
    console.log(claimButton);  
    console.log(requestButton);  

    restoreWalletConnection();
    updateButtonStatus();
});



if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (newAccounts) => {
        accounts = newAccounts;
        
        if (accounts.length > 0) {
            selectedAccount = accounts[0];
            
            if (provider) {
                signer = provider.getSigner(selectedAccount);
            }
            
            const walletAddress = document.getElementById("walletAddress");
            if (walletAddress) {
                walletAddress.innerText = `Connected: ${selectedAccount}`;
            }
            
            localStorage.setItem("walletAddress", selectedAccount);
            
            const accountSelect = document.getElementById("accountSelect");
            if (accountSelect) {
                updateAccountSelection();
            }
            
            updateButtonStatus();
        } else {
            const walletAddress = document.getElementById("walletAddress");
            if (walletAddress) {
                walletAddress.innerText = "Wallet disconnected";
            }
            
            localStorage.removeItem("walletAddress");
        }
    });

    window.ethereum.on("chainChanged", async (chainId) => {
        const walletAddress = document.getElementById("walletAddress");
        
        if (chainId !== '0x42') {
            showToast("❌ Wrong network. Switch to Holesky Testnet.", "error");
        } else if (walletAddress && selectedAccount) {
            walletAddress.innerText = `Connected: ${selectedAccount}`;
        }
    });
}

window.addEventListener("load", () => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    if (window.ethereum) {
        window.ethereum.removeAllListeners();
    }
});

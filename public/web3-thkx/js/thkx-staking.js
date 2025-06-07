const contractAddress = "0x96cdF0eAc07703643697FaF684B620805B13F275";
const stakingAbi = [
  "function stake(uint256 amount, uint256 duration) external",
  "function unstakePartial(uint256 amount) external",
  "function compoundRewards() external",
  "function emergencyWithdraw() external",
  "function distributeAirdrop(uint256 amount) external",
  "function stakes(address) view returns (uint256 amount, uint256 lastUpdated, uint256 lockUntil)",
  "function rewardRate() view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function getUserInfo(address) view returns (uint256, uint256, uint256, uint256, uint256, uint256)",
  "function getContractInfo() view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool)",
];

const tokenAddress = "0xDAc51d939dc6d6FbA786601a80E9Cd0fF5B288c4";
const tokenAbi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

let provider, signer, stakingContract, tokenContract;
let isManuallyDisconnected = false;
let updateIntervalId = null;
let rewardChart = null;

function handleEthError(error) {
  if (error.code) {
    switch (error.code) {
      case 4001:
      case "ACTION_REJECTED":
        return "You rejected the transaction in your wallet. Please confirm to proceed.";
      case -32603:
        return (
          error.data?.message ||
          "Internal error - Check contract state or network"
        );
      case -32000:
        return "Insufficient funds for gas. Please add more funds.";
      case "UNPREDICTABLE_GAS_LIMIT":
        return (
          error.reason ||
          "Cannot estimate gas - Check parameters, approvals, or contract state"
        );
      case -32002:
        return "Transaction already in progress - Please wait.";
      case -32602:
        return "Invalid parameters - Check input values.";
      default:
        return `Error ${error.code}: ${error.message || "Unknown error"}`;
    }
  }
  return error.message || "An unexpected error occurred";
}

function displayError(elementId, message, isWarning = false) {
  const errorDiv = document.getElementById(elementId);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.color = isWarning ? "#ffcc00" : "#ff4d8c";
    setTimeout(() => {
      errorDiv.textContent = "";
    }, 4000);
  }
}

function toggleButtons(enable) {
  const buttons = [
    "stakeBtn",
    "unstakeBtn",
    "compoundBtn",
    "emergencyBtn",
    "airdropBtn",
  ];
  buttons.forEach((btnId) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.disabled = !enable;
  });
}

function updateWalletUI(isConnected) {
  const connectBtn = document.getElementById("connectWallet");
  const disconnectBtn = document.getElementById("disconnectWallet");
  if (isConnected) {
    connectBtn.style.display = "none";
    disconnectBtn.style.display = "inline-block";
  } else {
    connectBtn.style.display = "inline-block";
    disconnectBtn.style.display = "none";
  }
}

async function connectWallet(autoConnect = false) {
  try {
    if (!window.ethereum) throw new Error("Please install MetaMask!");
    provider = new ethers.providers.Web3Provider(window.ethereum);

    if (!autoConnect) {
      await provider.send("eth_requestAccounts", []);
    }

    signer = provider.getSigner();
    stakingContract = new ethers.Contract(contractAddress, stakingAbi, signer);
    tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);

    const walletAddress = await signer.getAddress();
    document.getElementById(
      "walletAddress"
    ).innerText = `Connected: ${walletAddress.slice(
      0,
      6
    )}...${walletAddress.slice(-4)}`;
    localStorage.setItem("lastConnectedWallet", walletAddress);
    isManuallyDisconnected = false;

    toggleButtons(true);
    updateWalletUI(true);
    displayError(
      "connectionError",
      autoConnect ? "Reconnected automatically!" : "Connected successfully!"
    );
    
    await updateAllInfo();
    await initDashboard();
    
    if (!updateIntervalId) {
      updateIntervalId = setInterval(updateAllInfo, 1000);
    }

    const contractInfo = await stakingContract.getContractInfo();
    if (contractInfo[7]) {
      displayError(
        "connectionError",
        "Contract is currently paused by owner.",
        true
      );
      toggleButtons(false);
    }
  } catch (error) {
    displayError(
      "connectionError",
      autoConnect
        ? `Auto-connect failed: ${handleEthError(error)}`
        : handleEthError(error)
    );
    toggleButtons(false);
    if (!autoConnect) localStorage.removeItem("lastConnectedWallet");
  }
}

async function disconnectWallet() {
  provider = null;
  signer = null;
  stakingContract = null;
  tokenContract = null;
  isManuallyDisconnected = true;
  localStorage.removeItem("lastConnectedWallet");
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
    updateIntervalId = null;
  }
  if (rewardChart) {
    rewardChart.destroy();
    rewardChart = null;
  }
  document.getElementById("walletAddress").innerText = "Disconnected";
  toggleButtons(false);
  updateWalletUI(false);
  displayError("connectionError", "Wallet disconnected successfully!");
  await initDashboard();
}

async function tryAutoConnect() {
  if (isManuallyDisconnected) return;

  const lastWallet = localStorage.getItem("lastConnectedWallet");
  if (lastWallet && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (
        accounts.length > 0 &&
        accounts[0].toLowerCase() === lastWallet.toLowerCase()
      ) {
        await connectWallet(true);
      }
    } catch (error) {
      console.error("Auto-connect check failed:", error);
    }
  }
}

async function approveTokens(amountWei) {
  try {
    const userAddress = await signer.getAddress();
    const allowance = await tokenContract.allowance(
      userAddress,
      contractAddress
    );

    if (allowance.lt(amountWei)) {
      displayError(
        "stakeError",
        "Approving tokens - Please Confirm In MetaMask..."
      );
      const tx = await tokenContract.approve(contractAddress, amountWei, {
        gasLimit: 100000,
      });
      await tx.wait();
      displayError("stakeError", "Tokens Approved Successfully!");
      return true;
    }
    return false;
  } catch (error) {
    throw new Error(`Approval Failed: ${handleEthError(error)}`);
  }
}

async function stakeTokens() {
  try {
    if (!signer) throw new Error("Please connect your wallet first");
    const amount = document.getElementById("stakeAmount").value;
    const duration = document.getElementById("stakeDuration").value;

    if (!amount || amount <= 0)
      throw new Error("Amount must be greater than 0");
    if (!duration || duration < 1 || duration > 365)
      throw new Error("Duration must be between 1 and 365 days");

    const amountWei = ethers.utils.parseEther(amount.toString());
    const durationSeconds = ethers.BigNumber.from(duration).mul(86400);
    const balance = await tokenContract.balanceOf(await signer.getAddress());

    if (balance.lt(amountWei)) throw new Error("Insufficient THKX balance");

    const contractInfo = await stakingContract.getContractInfo();
    if (contractInfo[7])
      throw new Error("Contract is paused - staking is disabled");

    const userInfo = await stakingContract.getUserInfo(
      await signer.getAddress()
    );
    if (userInfo[3].gt(0)) {
      displayError(
        "stakeError",
        "Pending rewards detected - compounding before staking...",
        true
      );
      const gasEstimateCompound =
        await stakingContract.estimateGas.compoundRewards();
      const txCompound = await stakingContract.compoundRewards({
        gasLimit: gasEstimateCompound.mul(120).div(100),
      });
      await txCompound.wait();
      displayError("stakeError", "Rewards compounded successfully!");
    }

    const bonusMultiplier = 100 + Math.floor(duration / 30) * 5;
    displayError(
      "stakeError",
      `Staking with ${bonusMultiplier}% bonus based on ${duration} days lock period`,
      true
    );

    await approveTokens(amountWei);

    const gasEstimate = await stakingContract.estimateGas.stake(
      amountWei,
      durationSeconds
    );
    const tx = await stakingContract.stake(amountWei, durationSeconds, {
      gasLimit: gasEstimate.mul(120).div(100),
    });

    displayError("stakeError", "Transaction submitted - please wait...");
    await tx.wait();
    displayError("stakeError", "Staked successfully!");
    await updateAllInfo();
  } catch (error) {
    displayError("stakeError", `Staking Failed: ${handleEthError(error)}`);
  }
}

async function unstakeTokens() {
  try {
    if (!signer) throw new Error("Please connect your wallet first");
    const amount = document.getElementById("unstakeAmount").value;
    if (!amount || amount <= 0)
      throw new Error("Amount must be greater than 0");

    const amountWei = ethers.utils.parseEther(amount);
    const userInfo = await stakingContract.getUserInfo(
      await signer.getAddress()
    );

    if (userInfo[0].lt(amountWei))
      throw new Error("Insufficient staked amount");
    if (userInfo[4] > 0) {
      displayError(
        "unstakeError",
        `Early unstake fee: ${userInfo[4]}% will be applied`,
        true
      );
    }

    const gasEstimate = await stakingContract.estimateGas.unstakePartial(
      amountWei
    );
    const tx = await stakingContract.unstakePartial(amountWei, {
      gasLimit: gasEstimate.mul(120).div(100),
    });

    displayError("unstakeError", "Transaction submitted - please wait...");
    await tx.wait();
    displayError("unstakeError", "Unstaked successfully!");
    await updateAllInfo();
  } catch (error) {
    displayError("unstakeError", `Unstaking Failed: ${handleEthError(error)}`);
  }
}

async function compoundRewards() {
  try {
    if (!signer) throw new Error("Please connect your wallet first");
    const userInfo = await stakingContract.getUserInfo(
      await signer.getAddress()
    );
    if (userInfo[3].eq(0)) throw new Error("No rewards available to compound");

    displayError(
      "compoundError",
      `Compounding ${ethers.utils.formatEther(userInfo[3])} THKX rewards`,
      true
    );

    const gasEstimate = await stakingContract.estimateGas.compoundRewards();
    const tx = await stakingContract.compoundRewards({
      gasLimit: gasEstimate.mul(120).div(100),
    });

    displayError("compoundError", "Transaction submitted - please wait...");
    await tx.wait();
    displayError("compoundError", "Rewards compounded successfully!");
    await updateAllInfo();
  } catch (error) {
    displayError(
      "compoundError",
      `Compounding Failed: ${handleEthError(error)}`
    );
  }
}

async function emergencyWithdraw() {
  try {
    if (!signer) throw new Error("Please connect your wallet first");
    const userInfo = await stakingContract.getUserInfo(
      await signer.getAddress()
    );
    if (userInfo[0].eq(0)) throw new Error("No staked tokens to withdraw");

    displayError(
      "emergencyError",
      "Emergency withdraw will forfeit rewards",
      true
    );

    const gasEstimate = await stakingContract.estimateGas.emergencyWithdraw();
    const tx = await stakingContract.emergencyWithdraw({
      gasLimit: gasEstimate.mul(120).div(100),
    });

    displayError("emergencyError", "Transaction submitted - please wait...");
    await tx.wait();
    displayError("emergencyError", "Emergency withdrawal completed!");
    await updateAllInfo();
  } catch (error) {
    displayError(
      "emergencyError",
      `Emergency Withdrawal Failed: ${handleEthError(error)}`
    );
  }
}

async function distributeAirdrop() {
  try {
    if (!signer) throw new Error("Please connect your wallet first");
    const amount = document.getElementById("airdropAmount").value;
    if (!amount || amount <= 0)
      throw new Error("Amount must be greater than 0");

    const amountWei = ethers.utils.parseEther(amount);
    const contractBalance = await tokenContract.balanceOf(contractAddress);
    if (contractBalance.lt(amountWei))
      throw new Error("Insufficient contract balance for airdrop");

    displayError(
      "airdropError",
      `Distributing ${amount} THKX to all stakers`,
      true
    );

    const gasEstimate = await stakingContract.estimateGas.distributeAirdrop(
      amountWei
    );
    const tx = await stakingContract.distributeAirdrop(amountWei, {
      gasLimit: gasEstimate.mul(120).div(100),
    });

    displayError("airdropError", "Transaction submitted - please wait...");
    await tx.wait();
    displayError("airdropError", "Airdrop distributed successfully!");
    await updateAllInfo();
  } catch (error) {
    displayError("airdropError", `Airdrop Failed: ${handleEthError(error)}`);
  }
}

async function updateAllInfo() {
  try {
    if (!stakingContract || !signer) return;

    const address = await signer.getAddress();
    const [userInfo, contractInfo] = await Promise.all([
      stakingContract.getUserInfo(address),
      stakingContract.getContractInfo(),
    ]);

    document.getElementById("stakedAmount").innerText =
      ethers.utils.formatEther(userInfo[0]);
    document.getElementById("lastUpdated").innerText = new Date(
      Number(userInfo[1]) * 1000
    ).toLocaleString();
    document.getElementById("lockUntil").innerText = new Date(
      Number(userInfo[2]) * 1000
    ).toLocaleString();
    document.getElementById("pendingRewards").innerText =
      ethers.utils.formatEther(userInfo[3]);
    document.getElementById("unstakeFee").innerText = userInfo[4].toString();
    document.getElementById("timeUntilUnlock").innerText = `${userInfo[5]
      .div(86400)
      .toString()} days`;

    document.getElementById("totalStaked").innerText = ethers.utils.formatEther(
      contractInfo[0]
    );
    document.getElementById("rewardRate").innerText =
      contractInfo[1].toString();

    const nextHalving = Number(contractInfo[3]) + Number(contractInfo[2]);
    const timeToNextHalving = nextHalving - Math.floor(Date.now() / 1000);
    if (timeToNextHalving <= 7 * 86400) {
      displayError(
        "connectionError",
        `Reward rate will halve in ${Math.floor(
          timeToNextHalving / 86400
        )} days`,
        true
      );
    }
  } catch (error) {
    console.error("Failed to update info:", handleEthError(error));
  }
}

async function updatePendingRewards() {
  try {
    if (!signer || !stakingContract || !rewardChart) return;

    const walletAddress = await signer.getAddress();
    const userInfo = await stakingContract.getUserInfo(walletAddress);
    const pendingRewards = parseFloat(
      ethers.utils.formatUnits(userInfo[3], 18)
    ).toFixed(4);

    const currentTime = new Date();
    rewardChart.data.labels.push(currentTime.toLocaleTimeString());
    rewardChart.data.datasets[0].data.push(pendingRewards);

    if (rewardChart.data.labels.length > 10) {
      rewardChart.data.labels.shift();
      rewardChart.data.datasets[0].data.shift();
    }

    rewardChart.update();
  } catch (error) {
    console.error("Failed to update pending rewards:", handleEthError(error));
  }
}

async function startHalvingCountdown() {
  try {
    if (!stakingContract) return;

    const contractInfo = await stakingContract.getContractInfo();
    const lastHalving = contractInfo[3];
    const halvingInterval = contractInfo[2];
    const nextHalving = Number(lastHalving) + Number(halvingInterval);

    function updateCountdown() {
      const now = Math.floor(Date.now() / 1000);
      let secondsLeft = nextHalving - now;
      if (secondsLeft < 0) secondsLeft = 0;

      const days = Math.floor(secondsLeft / (60 * 60 * 24));
      const hours = Math.floor((secondsLeft % (60 * 60 * 24)) / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const seconds = secondsLeft % 60;

      document.getElementById(
        "halvingCountdown"
      ).innerText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
  } catch (error) {
    console.error("Failed to start halving countdown:", handleEthError(error));
  }
}

async function initDashboard() {
  const canvas = document.getElementById("rewardLineChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (rewardChart) {
    rewardChart.destroy();
    rewardChart = null;
  }

  rewardChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Pending Rewards (THKX)",
          data: [],
          backgroundColor: "rgba(40, 167, 69, 0.2)",
          borderColor: "#28a745",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      scales: {
        x: { display: true, title: { display: true, text: "Time" } },
        y: { display: true, title: { display: true, text: "THKX" } },
      },
    },
  });

  const chartContainer = canvas.parentElement;
  const existingMessage = chartContainer.querySelector(".connection-message");
  if (existingMessage) {
    existingMessage.remove();
  }

  if (!signer || !stakingContract) {
    const message = document.createElement("div");
    message.textContent = "Please connect wallet to see reward data";
    message.style.color = "#ffcc00";
    message.className = "connection-message";
    chartContainer.prepend(message);
    return;
  }

  await updatePendingRewards();
  setInterval(updatePendingRewards, 1500);
  await startHalvingCountdown();
}

document.addEventListener("DOMContentLoaded", () => {
  const buttons = {
    connectWallet: () => connectWallet(false),
    disconnectWallet: disconnectWallet,
    stakeBtn: stakeTokens,
    unstakeBtn: unstakeTokens,
    compoundBtn: compoundRewards,
    emergencyBtn: emergencyWithdraw,
    airdropBtn: distributeAirdrop,
  };

  Object.entries(buttons).forEach(([id, handler]) => {
    const element = document.getElementById(id);
    if (element) element.addEventListener("click", handler);
  });

  toggleButtons(false);
  tryAutoConnect();
  initDashboard();
});
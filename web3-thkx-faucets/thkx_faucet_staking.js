const tokenAddress = "0x9913bCC5972bEbc78495A1288DCC5f96f9c2fcd7";
const faucetAddress = "0xDcE2DeC47a9441b54dF643F206824a05E06f697D";
const stakingContractAddress = "0x10c7830DFB381ede63c6b4D6788f5fF02678023A";

let signer, provider;
let rewardsChart;
const APR = 10;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("connectWallet")?.addEventListener("click", connectWallet);
    document.getElementById("stakeButton")?.addEventListener("click", stakeTHKX);
    document.getElementById("unstakeButton")?.addEventListener("click", unstakeTHKX);
    document.getElementById("claimRewardsButton")?.addEventListener("click", claimRewards);

    if (localStorage.getItem("walletAddress")) {
        connectWallet();
    }
});

async function connectWallet() {
    try {
        if (!window.ethereum) {
            alert("❌ Metamask not detected!");
            return;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        const userAddress = await signer.getAddress();

        localStorage.setItem("walletAddress", userAddress);
        updateElementText("walletAddress", `✅ Wallet Connected: ${userAddress}`);

        console.log("✅ Wallet connected:", userAddress);
        await getStakedBalance();
        await getPendingRewards();
    } catch (error) {
        console.error("❌ Wallet connection failed:", error);
        updateElementText("status", `❌ Wallet connection failed: ${error.message}`);
    }
}

async function getStakedBalance() {
    try {
        const stakingContract = new ethers.Contract(stakingContractAddress, ["function getStakedBalance(address) external view returns (uint256)"], signer);
        const balance = await stakingContract.getStakedBalance(await signer.getAddress());
        updateElementText("stakedBalance", `Staked Balance: ${ethers.utils.formatUnits(balance, 18)} THKX`);
    } catch (error) {
        console.error("❌ Failed to fetch staked balance:", error);
    }
}

async function approveTHKX(amount) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ["function approve(address,uint256) external"], signer);
        const stakeAmount = ethers.utils.parseUnits(amount, 18);
        const txApprove = await tokenContract.approve(stakingContractAddress, stakeAmount);
        await txApprove.wait();
        console.log(`✅ Approved ${amount} THKX for staking.`);
        return true;
    } catch (error) {
        console.error("❌ Approval failed:", error);
        updateElementText("status", `❌ Approval failed: ${error.message}`);
        return false;
    }
}

async function stakeTHKX() {
    try {
        if (!signer) throw new Error("Wallet not connected");

        const amount = document.getElementById("stakeAmount").value;
        if (amount <= 0) throw new Error("Invalid amount");

        const approved = await approveTHKX(amount);
        if (!approved) return;

        const stakeAmount = ethers.utils.parseUnits(amount, 18);
        const stakingContract = new ethers.Contract(stakingContractAddress, ["function stake(uint256) external"], signer);
        
        const txStake = await stakingContract.stake(stakeAmount);
        await txStake.wait();

        updateElementText("status", `✅ Staked ${amount} THKX successfully!`);

        await getStakedBalance();
        await getPendingRewards();
    } catch (error) {
        updateElementText("status", `❌ Stake failed: ${error.message}`);
        console.error("❌ Stake failed:", error);
    }
}

async function unstakeTHKX() {
    try {
        if (!signer) throw new Error("Wallet not connected");

        const amount = document.getElementById("unstakeAmount").value;
        if (amount <= 0) throw new Error("Invalid amount");

        const unstakeAmount = ethers.utils.parseUnits(amount, 18);
        const stakingContract = new ethers.Contract(stakingContractAddress, ["function unstake(uint256) external"], signer);

        const txUnstake = await stakingContract.unstake(unstakeAmount);
        await txUnstake.wait();

        updateElementText("status", `✅ Unstaked ${amount} THKX successfully!`);

        await getStakedBalance();
        await getPendingRewards();
    } catch (error) {
        updateElementText("status", `❌ Unstake failed: ${error.message}`);
        console.error("❌ Unstake failed:", error);
    }
}

async function claimRewards() {
    try {
        if (!signer) throw new Error("Wallet not connected");

        const stakingContract = new ethers.Contract(stakingContractAddress, ["function claimRewards() external"], signer);
        
        const txClaim = await stakingContract.claimRewards();
        await txClaim.wait();

        updateElementText("status", "✅ Rewards claimed successfully!");

        await getPendingRewards();
        await getStakedBalance();
    } catch (error) {
        updateElementText("status", `❌ Claim Rewards failed: ${error.message}`);
        console.error("❌ Claim Rewards failed:", error);
    }
}

function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerText = text;
    } else {
        console.warn(`⚠️ Element with ID '${elementId}' not found.`);
    }
}
const rewardsData = {
    labels: [],
    datasets: [{
        label: "Pending Rewards (THKX)",
        data: [],
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
        tension: 0.3
    }]
};

async function getPendingRewards() {
    try {
        if (!signer) throw new Error("Wallet not connected");

        const stakingContract = new ethers.Contract(
            stakingContractAddress, 
            ["function calculatePendingRewards(address) external view returns (uint256)"], 
            signer
        );

        const rewards = await stakingContract.calculatePendingRewards(await signer.getAddress());
        const formattedRewards = ethers.utils.formatUnits(rewards, 18);

        updateElementText("pendingRewards", `Pending Rewards: ${formattedRewards} THKX`);
        
        updateRewardsChart(formattedRewards);
    } catch (error) {
        console.error("❌ Failed to fetch pending rewards:", error);
    }
}

function createRewardsChart() {
    const ctx = document.getElementById("rewardsChart").getContext("2d");
    rewardsChart = new Chart(ctx, {
        type: "line",
        data: rewardsData,
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "Time" } },
                y: { title: { display: true, text: "THKX Rewards" }, beginAtZero: true }
            }
        }
    });
}

function updateRewardsChart(rewardAmount) {
    const now = new Date().toLocaleTimeString();

    rewardsData.labels.push(now);
    rewardsData.datasets[0].data.push(parseFloat(rewardAmount));

    if (rewardsData.labels.length > 10) {
        rewardsData.labels.shift();
        rewardsData.datasets[0].data.shift();
    }

    rewardsChart.update();
}

document.addEventListener("DOMContentLoaded", () => {
    createRewardsChart();
    setInterval(() => signer && getPendingRewards(), 5000);
});

setInterval(() => signer && getPendingRewards(), 5000);
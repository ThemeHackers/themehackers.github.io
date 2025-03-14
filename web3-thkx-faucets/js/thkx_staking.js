const tokenAddress = "0xC8E6636547978f03dAC983902765D8EbC910EB4e";
const stakingContractAddress = "0x469E8d2319d23ea5f535F453D83fE9BbE53565af";

let signer, provider;
let rewardsChart;

const tokenABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)"
];

const stakingABI = [
    "function stake(uint256 amount) external",
    "function unstake(uint256 amount) external",
    "function claimRewards() external",
    "function toggleAutoCompound() external",
    "function depositRewards(uint256 amount) external",
    "function withdrawRewards(uint256 amount) external",
    "function stakers(address) external view returns (uint256 amount, uint256 rewardDebt, uint256 lastUpdated, uint256 lockEndTime)",
    "function calculatePendingRewards(address user) external view returns (uint256)",
    "function rewardPool() external view returns (uint256)",
    "function totalStaked() external view returns (uint256)",
    "function rewardRatePerSecond() external view returns (uint256)",
    "function lockPeriod() external view returns (uint256)",
    "function autoCompoundEnabled(address) external view returns (bool)",
    "function autoCompoundToggleEnabled() external view returns (bool)",
    "function calculateEarlyWithdrawalFee(uint256 stakedTime) external pure returns (uint256)",
    "event Staked(address indexed user, uint256 amount)",
    "event Unstaked(address indexed user, uint256 amount, uint256 fee)",
    "event RewardsClaimed(address indexed user, uint256 amount)"
];

console.log("thkx_staking.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded, attaching listeners");
    const buttonIds = {
        "connectWallet": connectWallet,
        "stakeButton": stakeTHKX,
        "unstakeButton": unstakeTHKX,
        "claimRewardsButton": claimRewards,
        "toggleAutoCompoundButton": toggleAutoCompound
    };

    Object.entries(buttonIds).forEach(([id, func]) => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener("click", func);
            console.log(`${id} listener added`);
        } else {
            console.error(`${id} not found in DOM`);
        }
    });

    createRewardsChart();
    setInterval(() => {
        if (signer) {
            console.log("Updating data...");
            updateAllData();
        }
    }, 5000);

    if (localStorage.getItem("walletAddress")) {
        console.log("Attempting auto-connect from localStorage");
        connectWallet();
    }
});

async function connectWallet() {
    try {
        if (!window.ethereum) throw new Error("MetaMask not detected!");
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        const userAddress = await signer.getAddress();

        localStorage.setItem("walletAddress", userAddress);
        updateElementText("walletAddress", `✅ Wallet Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`);
        updateElementText("status", "✅ Wallet connected successfully");
        console.log("✅ Wallet connected:", userAddress);

        ["stakeButton", "unstakeButton", "claimRewardsButton", "toggleAutoCompoundButton"].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.disabled = false;
        });

        await updateAllData();
    } catch (error) {
        console.error("❌ Wallet connection failed:", error);
        updateElementText("status", `❌ Wallet connection failed: ${error.message}`);
    }
}

async function updateAllData() {
    await getStakedInfo();
    await getPendingRewards();
    await getRewardPool();
    await getContractStats();
    await checkBalances();
}

async function checkBalances() {
    try {
        const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, signer);
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);
        const rewardPool = await stakingContract.rewardPool();
        const totalStaked = await stakingContract.totalStaked();
        const contractBalance = await tokenContract.balanceOf(stakingContractAddress);
        
        console.log(`Contract Balance: ${ethers.utils.formatUnits(contractBalance, 18)} THKX`);
        console.log(`Reward Pool: ${ethers.utils.formatUnits(rewardPool, 18)} THKX`);
        console.log(`Total Staked: ${ethers.utils.formatUnits(totalStaked, 18)} THKX`);
    } catch (error) {
        console.error("❌ Check balances failed:", error);
    }
}

async function getStakedInfo() {
    try {
        const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, signer);
        const userAddress = await signer.getAddress();
        const [amount, rewardDebt, lastUpdated, lockEndTime] = await stakingContract.stakers(userAddress);
        const autoCompound = await stakingContract.autoCompoundEnabled(userAddress);
        const toggleEnabled = await stakingContract.autoCompoundToggleEnabled();

        updateElementText("stakedBalance", `Staked Balance: ${ethers.utils.formatUnits(amount, 18)} THKX`);
        updateElementText("lockEndTime", `Lock End: ${new Date(lockEndTime * 1000).toLocaleString()}`);
        updateElementText("autoCompoundStatus", `Auto-Compound: ${autoCompound ? "Enabled" : "Disabled"} (${toggleEnabled ? "Toggle Allowed" : "Toggle Locked"})`);
    } catch (error) {
        console.error("❌ Failed to fetch staked info:", error);
    }
}

async function getRewardPool() {
    try {
        const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, signer);
        const rewardPool = await stakingContract.rewardPool();
        updateElementText("rewardPool", `Reward Pool: ${ethers.utils.formatUnits(rewardPool, 18)} THKX`);
    } catch (error) {
        console.error("❌ Failed to fetch reward pool:", error);
    }
}

async function getContractStats() {
    try {
        const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, signer);
        const totalStaked = await stakingContract.totalStaked();
        const rewardRate = await stakingContract.rewardRatePerSecond();
        const lockPeriod = await stakingContract.lockPeriod();

        const formattedTotalStaked = ethers.utils.formatUnits(totalStaked, 18);
        const formattedRewardRate = ethers.utils.formatUnits(rewardRate, 30); // Adjusted for 1e30 precision
        const formattedLockPeriod = (lockPeriod / 86400).toString();

        updateElementText("totalStaked", `Total Staked: ${formattedTotalStaked} THKX`);
        updateElementText("rewardRate", `Reward Rate: ${formattedRewardRate} THKX/s`);
        updateElementText("lockPeriod", `Lock Period: ${formattedLockPeriod} days`);
    } catch (error) {
        console.error("❌ Failed to fetch contract stats:", error);
    }
}

async function approveTHKX(amount) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);
        const stakeAmount = ethers.utils.parseUnits(amount, 18);
        const txApprove = await tokenContract.approve(stakingContractAddress, stakeAmount);
        await txApprove.wait();
        console.log(`✅ Approved ${amount} THKX for staking`);
        return true;
    } catch (error) {
        console.error("❌ Approval failed:", error);
        updateElementText("status", `❌ Approval failed: ${error.message}`);
        return false;
    }
}

async function stakeTHKX() {
    try {
        if (!signer) throw new Error("Please connect your wallet first!");

        const amount = document.getElementById("stakeAmount").value;
        if (!amount || amount <= 0) throw new Error("Invalid stake amount");

        const approved = await approveTHKX(amount);
        if (!approved) return;

        const stakeAmount = ethers.utils.parseUnits(amount, 18);
        const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, signer);
        const txStake = await stakingContract.stake(stakeAmount, { gasLimit: 300000 });
        await txStake.wait();

        updateElementText("status", `✅ Staked ${amount} THKX successfully!`);
        await updateAllData();
    } catch (error) {
        updateElementText("status", `❌ Stake failed: ${error.message}`);
        console.error("❌ Stake failed:", error);
    }
}

async function unstakeTHKX() {
    try {
        if (!signer) throw new Error("Please connect your wallet first!");

        const amount = document.getElementById("unstakeAmount").value;
        if (!amount || amount <= 0) throw new Error("Invalid unstake amount");

        const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, signer);
        const userAddress = await signer.getAddress();
        const [stakedAmount, , lastUpdated, lockEndTime] = await stakingContract.stakers(userAddress);
        const unstakeAmount = ethers.utils.parseUnits(amount, 18);

        if (unstakeAmount.gt(stakedAmount)) throw new Error("Insufficient staked balance");
        if (block.timestamp < lockEndTime) {
            const stakedTime = Math.floor(Date.now() / 1000) - lastUpdated;
            const feePercent = await stakingContract.calculateEarlyWithdrawalFee(stakedTime);
            updateElementText("status", `⚠️ Early withdrawal: ${feePercent}% fee will apply`);
        }

        const txUnstake = await stakingContract.unstake(unstakeAmount, { gasLimit: 300000 });
        await txUnstake.wait();

        updateElementText("status", `✅ Unstaked ${amount} THKX successfully!`);
        await updateAllData();
    } catch (error) {
        updateElementText("status", `❌ Unstake failed: ${error.message}`);
        console.error("❌ Unstake failed:", error);
    }
}

async function claimRewards() {
    try {
        if (!signer) throw new Error("Please connect your wallet first!");

        const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, signer);
        const userAddress = await signer.getAddress();
        const [, , lastUpdated] = await stakingContract.stakers(userAddress);
        const pendingRewards = await stakingContract.calculatePendingRewards(userAddress);

        if (Math.floor(Date.now() / 1000) < lastUpdated + 86400) {
            throw new Error("Must stake for at least 1 day before claiming");
        }
        if (pendingRewards.eq(0)) throw new Error("No rewards to claim");

        const txClaim = await stakingContract.claimRewards({ gasLimit: 300000 });
        await txClaim.wait();

        updateElementText("status", "✅ Rewards claimed successfully!");
        await updateAllData();
    } catch (error) {
        updateElementText("status", `❌ Claim rewards failed: ${error.message}`);
        console.error("❌ Claim rewards failed:", error);
    }
}

async function toggleAutoCompound() {
    try {
        if (!signer) throw new Error("Please connect your wallet first!");

        const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, signer);
        const toggleEnabled = await stakingContract.autoCompoundToggleEnabled();
        if (!toggleEnabled) throw new Error("Auto-compound toggle is disabled by owner");

        const txToggle = await stakingContract.toggleAutoCompound({ gasLimit: 100000 });
        await txToggle.wait();

        const autoCompound = await stakingContract.autoCompoundEnabled(await signer.getAddress());
        updateElementText("status", `✅ Auto-compounding ${autoCompound ? "enabled" : "disabled"}!`);
        await updateAllData();
    } catch (error) {
        updateElementText("status", `❌ Toggle auto-compound failed: ${error.message}`);
        console.error("❌ Toggle auto-compound failed:", error);
    }
}

async function getPendingRewards() {
    try {
        if (!signer) return;

        const stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, signer);
        const rewards = await stakingContract.calculatePendingRewards(await signer.getAddress());
        const formattedRewards = ethers.utils.formatUnits(rewards, 18);

        updateElementText("pendingRewards", `Pending Rewards: ${formattedRewards} THKX`);
        updateRewardsChart(formattedRewards);
    } catch (error) {
        console.error("❌ Failed to fetch pending rewards:", error);
    }
}

function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.innerText = text;
    else console.warn(`⚠️ Element with ID '${elementId}' not found`);
}

const rewardsData = {
    labels: [],
    datasets: [{
        label: "Pending Rewards (THKX)",
        data: [],
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
        tension: 0.3,
    }]
};

function createRewardsChart() {
    const ctx = document.getElementById("rewardsChart")?.getContext("2d");
    if (!ctx) {
        console.error("Rewards chart canvas not found");
        return;
    }

    rewardsChart = new Chart(ctx, {
        type: "line",
        data: rewardsData,
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "Time" } },
                y: {
                    title: { display: true, text: "THKX Rewards" },
                    beginAtZero: true
                }
            }
        }
    });
    console.log("Rewards chart initialized");
}

function updateRewardsChart(rewardAmount) {
    if (!rewardsChart) return;

    const now = new Date().toLocaleTimeString();
    rewardsData.labels.push(now);
    rewardsData.datasets[0].data.push(parseFloat(rewardAmount));

    if (rewardsData.labels.length > 10) {
        rewardsData.labels.shift();
        rewardsData.datasets[0].data.shift();
    }

    rewardsChart.update();
}
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();


const tokenAddress = "0xDAc51d939dc6d6FbA786601a80E9Cd0fF5B288c4";  
const faucetAddress = "0xf5d4294041dB535bE839673382C747f8BB40375E";  


const tokenAbi = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)"
];

const faucetAbi = [
  "function claimFreeTHKX() public"
];


const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
const faucetContract = new ethers.Contract(faucetAddress, faucetAbi, signer);

// FAQ Functionality
document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const faqItem = question.parentElement;
    const isActive = faqItem.classList.contains('active');
    
    // Close all FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Toggle current FAQ item
    if (!isActive) {
      faqItem.classList.add('active');
    }
  });
});

// Enhanced Claim Button Functionality
document.getElementById("claimBtn").addEventListener("click", async () => {
  const button = document.getElementById("claimBtn");
  const status = document.getElementById("status");
  
  try {
    if (typeof window.ethereum === "undefined") {
      status.textContent = "❌ Ethereum wallet not detected. Please install MetaMask.";
      return;
    }

    // Add loading state
    button.classList.add('loading');
    status.textContent = "🔍 Connecting to wallet...";

    await provider.send("eth_requestAccounts", []); 
    const userAddress = await signer.getAddress();

    status.textContent = "🔍 Checking allowance...";

    const currentAllowance = await tokenContract.allowance(userAddress, faucetAddress);
    const maxAllowance = ethers.constants.MaxUint256;

    if (currentAllowance.lt(ethers.utils.parseUnits("1", 18))) {
      status.textContent = "🔑 Approving THKX tokens...";
      const approveTx = await tokenContract.approve(faucetAddress, maxAllowance);
      await approveTx.wait();
      status.textContent = "✅ Approved! Claiming THKX...";
    } else {
      status.textContent = "✅ Already approved. Claiming THKX...";
    }

    const claimTx = await faucetContract.claimFreeTHKX();
    await claimTx.wait();
    status.textContent = "🎉 Claimed THKX successfully!";
    
    // Add success animation
    button.classList.remove('loading');
    button.classList.add('success');
    setTimeout(() => button.classList.remove('success'), 2000);
    
  } catch (err) {
    console.error(err);
    button.classList.remove('loading');

    if (err.reason) {
      status.textContent = `❌ Error: ${err.reason}`;
    } else if (err.code === 4001) {
      status.textContent = "❌ Transaction rejected by user.";
    } else if (err.code === -32002) {
      status.textContent = "⚠️ Transaction pending. Please check your wallet.";
    } else {
      status.textContent = `❌ Error: ${err.message}`;
    }
  }
});

// Add smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Add intersection observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.topic-card, .testimonial-card, .partner-card').forEach(el => {
  observer.observe(el);
});

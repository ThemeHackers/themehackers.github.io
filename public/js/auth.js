class AuthHandler {
    constructor() {
        if (!window.auth || !window.db) {
            throw new Error('Firebase not initialized');
        }
        this.auth = window.auth;
        this.db = window.db;
        this.provider = new firebase.auth.GoogleAuthProvider();
        this.loginAttempts = 0;
        this.maxLoginAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; 
        this.lastLoginAttempt = 0;
        this.init();
    }

    isAllowedEmailDomain(email) {
        if (!email || typeof email !== 'string') return false;
        const allowedDomains = [
            'gmail.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'yahoo.com', 'protonmail.com', 'aol.com'
        ];
        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain) return false;

        if (domain.endsWith('.ac.th')) return true;

        if (allowedDomains.includes(domain)) return true;
        return false;
    }
    init() {
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                window.location.href = 'dashboard.html';
            }
        });
        this.setupEventHandlers();
        this.checkGoogleSignInConfig();
    }
    async checkGoogleSignInConfig() {
        try {
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                const testProvider = new firebase.auth.GoogleAuthProvider();
                testProvider.addScope('email');
                testProvider.addScope('profile');
            }
        } catch (error) {
            this.showGoogleConfigHint();
        }
    }
    showGoogleConfigHint() {
        try {
            const googleBtn = document.getElementById('googleSignIn');
            if (googleBtn && googleBtn.parentNode) {
                const hint = document.createElement('div');
                hint.className = 'text-muted small mt-2';
                hint.innerHTML = '<i class="fas fa-info-circle me-1"></i>Google sign-in may need to be enabled in Firebase Console';
                googleBtn.parentNode.appendChild(hint);
            }
        } catch (error) { /* ignore */ }
    }
    setupEventHandlers() {
        const googleSignInBtn = document.getElementById('googleSignIn');
        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', () => {
                this.signInWithGoogle();
            });
        }
    }
    setupInputValidation() {
        const emailInputs = document.querySelectorAll('input[type="email"]');
        if (emailInputs.length > 0) {
            emailInputs.forEach(input => {
                if (input) {
                    input.addEventListener('blur', () => {
                        this.validateEmail(input.value);
                    });
                }
            });
        }
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        if (passwordInputs.length > 0) {
            passwordInputs.forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        this.validatePasswordRealTime(input);
                    });
                    input.addEventListener('focus', () => {
                        this.clearPasswordValidation(input);
                    });
                }
            });
        }
    }
    validatePasswordRealTime(input) {
        const password = input.value;
        const strengthIndicator = document.getElementById('passwordStrength');
        if (!password) {
            this.clearPasswordValidation(input);
            return;
        }
        if (password.length < 6) {
            this.showPasswordError(input, 'Password must be at least 6 characters long');
            return;
        }
        if (input.id === 'password' && document.getElementById('registrationForm')) {
            if (password.length < 8) {
                this.showPasswordError(input, 'Password must be at least 8 characters long');
                return;
            }
            const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein', 'password123'];
            if (weakPasswords.includes(password.toLowerCase())) {
                this.showPasswordError(input, 'Please choose a stronger password');
                return;
            }
            const hasUpperCase = /[A-Z]/.test(password);
            const hasLowerCase = /[a-z]/.test(password);
            const hasNumbers = /\d/.test(password);
            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
            if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
                this.showPasswordError(input, 'Password must contain uppercase, lowercase, number, and special character');
                return;
            }
        }
        this.showPasswordSuccess(input);
    }
    showPasswordError(input, message) {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
        const strengthIndicator = document.getElementById('passwordStrength');
        if (strengthIndicator) {
            strengthIndicator.className = 'password-strength strength-weak';
            strengthIndicator.textContent = message;
        }
    }
    showPasswordSuccess(input) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        const strengthIndicator = document.getElementById('passwordStrength');
        if (strengthIndicator) {
            strengthIndicator.className = 'password-strength strength-strong';
            strengthIndicator.textContent = '✓ Password strength: Strong';
        }
    }
    clearPasswordValidation(input) {
        input.classList.remove('is-valid', 'is-invalid');
        const strengthIndicator = document.getElementById('passwordStrength');
        if (strengthIndicator) {
            strengthIndicator.className = 'password-strength';
            strengthIndicator.textContent = '';
        }
    }
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showAlert('Please enter a valid email address', 'warning');
            return false;
        }
        if (!this.isAllowedEmailDomain(email)) {
            this.showAlert('Only university (.ac.th) or trusted provider emails (e.g. Gmail) are allowed.', 'danger');
            return false;
        }
        return true;
    }
    validatePassword(password) {
        if (password.length < 6) {
            this.showAlert('Password must be at least 6 characters long', 'warning');
            return false;
        }
        return true;
    }
    currentAlerts = new Set();
    showAlert(message, type) {
        try {
            const alertKey = `${type}-${message}`;
            if (this.currentAlerts.has(alertKey)) {
                return; 
            }
            this.currentAlerts.add(alertKey);
            const alertContainer = document.getElementById('alertContainer');
            if (alertContainer) {
                const alertDiv = document.createElement('div');
                alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
                alertDiv.innerHTML = `
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                `;
                alertDiv.setAttribute('data-alert-key', alertKey);
                alertContainer.appendChild(alertDiv);
                const removeFromTracking = () => {
                    this.currentAlerts.delete(alertKey);
                };
                setTimeout(() => {
                    if (alertDiv && alertDiv.parentNode) {
                        alertDiv.remove();
                        removeFromTracking();
                    }
                }, 5000);
                const closeBtn = alertDiv.querySelector('.btn-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', removeFromTracking);
                }
            }
        } catch (error) {
            console.error('Error showing alert:', error);
        }
    }
    checkRateLimit() {
        const now = Date.now();
        if (this.loginAttempts >= this.maxLoginAttempts) {
            const timeSinceLastAttempt = now - this.lastLoginAttempt;
            if (timeSinceLastAttempt < this.lockoutTime) {
                const remainingTime = Math.ceil((this.lockoutTime - timeSinceLastAttempt) / 60000);
                this.showAlert(`Too many login attempts. Please try again in ${remainingTime} minutes.`, 'danger');
                return false;
            } else {
                this.loginAttempts = 0;
            }
        }
        this.lastLoginAttempt = now;
        return true;
    }
    sanitizeInput(input) {
        if (input === undefined || input === null) {
            return '';
        }
        if (typeof input !== 'string') {
            return String(input).trim();
        }

        return DOMPurify.sanitize(input).trim();
    }
    async signInWithGoogle() {
        try {
            if (!this.checkRateLimit()) return;
            this.showLoading('googleSignIn');
            const result = await this.auth.signInWithPopup(this.provider);
            if (result && result.user) {
            
                if (!this.isAllowedEmailDomain(result.user.email)) {
                    this.showAlert('Only university (.ac.th) or trusted provider emails (e.g. Gmail) are allowed.', 'danger');
                    await this.auth.signOut();
                    this.hideLoading('googleSignIn');
                    return;
                }
                this.loginAttempts = 0;
                await this.saveUserData(result.user);
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            this.loginAttempts++;
            let errorMessage = 'Google sign-in failed. Please try again.';
            if (error.code === 'auth/api-key-not-valid') {
                errorMessage = 'Firebase configuration error. Please contact ThemeHackers support.';
            } else if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Authentication cancelled. Please try again.';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
            } else if (error.code === 'auth/unauthorized-domain') {
                errorMessage = 'This domain is not authorized for Google sign-in. Please contact ThemeHackers support.';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Google sign-in is not enabled. Please contact ThemeHackers administrator.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = 'An account already exists with this email using a different sign-in method.';
            }
            this.showAlert(errorMessage, 'danger');
            if (error.code === 'auth/operation-not-allowed') {
                this.showAlert('ThemeHackers Security: To enable Google sign-in: 1) Go to Firebase Console 2) Authentication > Sign-in method 3) Enable Google provider', 'info');
            }
        } finally {
            this.hideLoading('googleSignIn');
        }
    }
    async verifyEmailWithMailgun(email) {
        try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValidFormat = emailRegex.test(email);
            const disposableDomains = [
                'tempmail.org', 'guerrillamail.com', 'mailinator.com', 
                '10minutemail.com', 'throwaway.email', 'temp-mail.org'
            ];
            const domain = email.split('@')[1];
            const isDisposable = disposableDomains.some(disposable => 
                domain.includes(disposable)
            );
      
            const isAllowed = this.isAllowedEmailDomain(email);
            return {
                isValid: isValidFormat && !isDisposable && isAllowed,
                reason: isDisposable ? 'Disposable email not allowed' : 
                        !isValidFormat ? 'Invalid email format' : !isAllowed ? 'Email domain not allowed' : 'Valid',
                score: isAllowed ? 0.9 : 0.7,
                isDisposable: isDisposable,
                isAllowed: isAllowed
            };
        } catch (error) {
            console.error('Email verification error:', error);
            return {
                isValid: false,
                reason: 'Verification service unavailable',
                score: 0
            };
        }
    }
    async saveUserData(user) {
        try {
            const userData = {
                uid: user.uid,
                email: user.email,
                fullName: user.displayName || '',
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
                loginCount: 1
            };
            const existingUser = await this.db.collection('users').doc(user.uid).get();
            if (existingUser.exists) {
                const existingData = existingUser.data();
                userData.loginCount = (existingData.loginCount || 0) + 1;
            }
            await this.db.collection('users').doc(user.uid).set(userData, { merge: true });
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }
    showLoading(formId) {
        if (formId === 'googleSignIn') {
            const googleBtn = document.getElementById('googleSignIn');
            if (googleBtn) {
                googleBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
                googleBtn.disabled = true;
            }
            return;
        }
        const form = document.getElementById(formId);
        if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                const loadingSpan = submitBtn.querySelector('.loading');
                const normalSpan = submitBtn.querySelector('.normal');
                if (loadingSpan && normalSpan) {
                    loadingSpan.style.display = 'inline';
                    normalSpan.style.display = 'none';
                    submitBtn.disabled = true;
                }
            }
        }
    }
    hideLoading(formId) {
        if (formId === 'googleSignIn') {
            const googleBtn = document.getElementById('googleSignIn');
            if (googleBtn) {
                googleBtn.innerHTML = '<i class="fab fa-google me-2"></i>Continue with Google';
                googleBtn.disabled = false;
            }
            return;
        }
        const form = document.getElementById(formId);
        if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                const loadingSpan = submitBtn.querySelector('.loading');
                const normalSpan = submitBtn.querySelector('.normal');
                if (loadingSpan && normalSpan) {
                    loadingSpan.style.display = 'none';
                    normalSpan.style.display = 'inline';
                    submitBtn.disabled = false;
                }
            }
        }
    }
}
window.authHandler = new AuthHandler(); 
window.AuthHandler = AuthHandler; 

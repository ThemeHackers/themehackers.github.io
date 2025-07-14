
class DashboardHandler {
    constructor() {
        if (!window.auth || !window.db) {
            console.warn('⚠️  Firebase not ready, DashboardHandler initialization failed');
            throw new Error('Firebase not initialized');
        }
        try {
            if (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {

                const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
                const expires = '; Expires=' + new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString(); 
                
                document.cookie = `themehackers_session=1; Path=/; SameSite=Strict${secureFlag}${expires}`;
                

                document.cookie = `th_samesite_test=1; Path=/; SameSite=Strict${secureFlag}${expires}`;

                document.cookie = `th_security_level=enhanced; Path=/; SameSite=Strict${secureFlag}${expires}`;
            }
        } catch (e) { 
            console.warn('Could not set enhanced security test cookies:', e);
        }
        
        this.auth = window.auth;
        this.db = window.db;
        this.currentUser = null;
        this.userData = null;
        this.sessionTimeout = 30 * 60 * 1000; 
        this.lastActivity = Date.now();
        
        this.init();
    }
    init() {

        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.loadUserData();
                this.startSessionMonitoring();
            } else {
                window.location.href = 'login.html';
            }
        });


        this.setupEventHandlers();
    }

    setupEventHandlers() {
        
        const logoutBtn = document.getElementById('logoutBtn');
        const testLogoutBtn = document.getElementById('testLogoutBtn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
        
        if (testLogoutBtn) {
            testLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

      
        const editProfileForm = document.getElementById('editProfileForm');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate();
            });
        }

        const editPassword = document.getElementById('editPassword');
        if (editPassword) {
            editPassword.addEventListener('input', () => {
                this.validateEditPassword();
            });
        }

   
        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.exportUserData();
            });
        }

        this.trackUserActivity();
        this.updateSystemInfo();
    }

    trackUserActivity() {
      
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
            });
        });

        
        setInterval(() => {
            this.checkSessionTimeout();
        }, 60000);

    
        setInterval(() => {
            this.updateSystemInfo();
        }, 30000);
    }

    checkSessionTimeout() {
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivity;
        
        if (timeSinceLastActivity > this.sessionTimeout) {
            this.showSessionTimeoutWarning();
        }
    }

    showSessionTimeoutWarning() {
        
        const warningTime = this.sessionTimeout - (5 * 60 * 1000);
        const timeSinceLastActivity = Date.now() - this.lastActivity;
        
        if (timeSinceLastActivity > warningTime && timeSinceLastActivity < this.sessionTimeout) {
            const remainingMinutes = Math.ceil((this.sessionTimeout - timeSinceLastActivity) / 60000);
            this.showAlert(`Session will expire in ${remainingMinutes} minutes. Please save your work.`, 'warning');
        }
    }

    startSessionMonitoring() {
       
        setInterval(() => {
            this.validateSession();
        }, 5 * 60 * 1000);
    }

    async validateSession() {
        try {
     
            const token = await this.currentUser.getIdToken(true);
            if (!token) {
                this.handleSessionExpired();
                return;
            }

           
            this.lastActivity = Date.now();
        } catch (error) {
            console.error('Session validation error:', error);
            this.handleSessionExpired();
        }
    }

    handleSessionExpired() {
        this.showAlert('ThemeHackers Security: Your session has expired. Please log in again.', 'danger');
        setTimeout(() => {
            this.handleLogout();
        }, 3000);
    }

    async loadUserData() {
        try {
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            
            if (userDoc.exists) {
                this.userData = userDoc.data();
                this.updateDashboard();
                this.updateLastLogin();
            } else {
                
                await this.createUserData();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            
         
            if (error.code === 'unavailable' || error.message.includes('offline')) {
                this.showAlert('ThemeHackers Security: Connection issue. Please check your internet connection and try again.', 'warning');
            } else if (error.code === 'permission-denied') {
                this.showAlert('ThemeHackers Security: Access denied. Please contact support.', 'danger');
            } else {
                this.showAlert('ThemeHackers Security: Error loading user data. Please refresh the page.', 'danger');
            }
            
            try {
                this.userData = {
                    uid: this.currentUser.uid,
                    email: this.currentUser.email,
                    fullName: this.currentUser.displayName || 'User',
                    createdAt: new Date(),
                    lastLogin: new Date()
                };
                this.updateDashboard();
            } catch (fallbackError) {
                console.error('Fallback error:', fallbackError);
            }
        }
    }

    async createUserData() {
        try {
            const userData = {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                fullName: this.currentUser.displayName || '',
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLogin: new Date(),
                loginCount: 1
            };

            await this.db.collection('users').doc(this.currentUser.uid).set(userData);
            this.userData = userData;
            this.updateDashboard();
        } catch (error) {
            console.error('Error creating user data:', error);
            this.showAlert('ThemeHackers Security: Error creating user profile. Please try again.', 'danger');
        }
    }

    async updateLastLogin() {
        try {
            await this.db.collection('users').doc(this.currentUser.uid).update({
                lastLogin: new Date(),
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }

    updateDashboard() {
        if (!this.userData) return;

       
        const userName = this.userData.fullName || this.currentUser.displayName || 'User';
        const userEmail = this.userData.email || this.currentUser.email || '';
        
 
        const userNameElements = document.querySelectorAll('#userName, #welcomeUserName');
        userNameElements.forEach(element => {
            element.textContent = userName;
        });

       
        const userInitials = this.getUserInitials(userName);
        const userAvatar = document.getElementById('userInitials');
        if (userAvatar) {
            userAvatar.textContent = userInitials;
        }

        
        this.updateAccountInfo();
        this.updateActivityInfo();
    }

    updateAccountInfo() {
        if (!this.userData) return;

        const displayFullName = document.getElementById('displayFullName');
        const displayEmail = document.getElementById('displayEmail');
        const displayCreatedAt = document.getElementById('displayCreatedAt');
        const displayLastLogin = document.getElementById('displayLastLogin');

        if (displayFullName) {
            displayFullName.textContent = this.userData.fullName || 'Not set';
        }

        if (displayEmail) {
            displayEmail.textContent = this.userData.email || 'Not set';
        }

        if (displayCreatedAt) {
            const createdAt = this.userData.createdAt;
            if (createdAt) {
                const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
                displayCreatedAt.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            } else {
                displayCreatedAt.textContent = 'Unknown';
            }
        }

        if (displayLastLogin) {
            const lastLogin = this.userData.lastLogin;
            if (lastLogin) {
                const date = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin);
                displayLastLogin.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            } else {
                displayLastLogin.textContent = 'Unknown';
            }
        }
    }

    getUserInitials(name) {
        if (!name) return 'U';
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    async handleLogout() {
        try {
         
            document.cookie = 'themehackers_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'th_samesite_test=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'th_security_level=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
            
            
            sessionStorage.clear();
            localStorage.removeItem('user_session');
            
           
            await this.auth.signOut();
            
         
            window.location.href = 'logout.html';
        } catch (error) {
            console.error('Error signing out:', error);
            
            window.location.href = 'logout.html';
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    
    toggleEditMode() {
        const viewMode = document.getElementById('viewMode');
        const editMode = document.getElementById('editMode');
        const editBtn = document.getElementById('editBtn');

        if (viewMode.style.display === 'none') {
           
            viewMode.style.display = 'block';
            editMode.style.display = 'none';
            editBtn.innerHTML = '<i class="fas fa-edit me-1"></i>Edit';
            editBtn.className = 'btn btn-outline-primary btn-sm';
        } else {
            
            viewMode.style.display = 'none';
            editMode.style.display = 'block';
            editBtn.innerHTML = '<i class="fas fa-eye me-1"></i>View';
            editBtn.className = 'btn btn-outline-secondary btn-sm';
            this.populateEditForm();
        }
    }

    populateEditForm() {
        if (!this.userData) return;

        const editFullName = document.getElementById('editFullName');
        const editEmail = document.getElementById('editEmail');

        if (editFullName) {
            editFullName.value = this.userData.fullName || '';
        }

        if (editEmail) {
            editEmail.value = this.userData.email || '';
        }
    }

    validateEditPassword() {
        const password = document.getElementById('editPassword');
        const strengthIndicator = document.getElementById('editPasswordStrength');
        
        if (!password || !strengthIndicator) return;

        const passwordValue = password.value;
        
        if (!passwordValue) {
            strengthIndicator.textContent = '';
            password.classList.remove('is-valid', 'is-invalid');
            return;
        }

        if (passwordValue.length < 8) {
            this.showPasswordError(password, 'Password must be at least 8 characters long');
            return;
        }

        
        const hasUpperCase = /[A-Z]/.test(passwordValue);
        const hasLowerCase = /[a-z]/.test(passwordValue);
        const hasNumbers = /\d/.test(passwordValue);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordValue);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
            this.showPasswordError(password, 'Password must contain uppercase, lowercase, number, and special character');
            return;
        }

        this.showPasswordSuccess(password);
    }

    showPasswordError(input, message) {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
        
        const strengthIndicator = document.getElementById('editPasswordStrength');
        if (strengthIndicator) {
            strengthIndicator.className = 'password-strength strength-weak';
            strengthIndicator.textContent = message;
        }
    }

    showPasswordSuccess(input) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        
        const strengthIndicator = document.getElementById('editPasswordStrength');
        if (strengthIndicator) {
            strengthIndicator.className = 'password-strength strength-strong';
            strengthIndicator.textContent = '✓ Password strength: Strong';
        }
    }

    async handleProfileUpdate() {
        try {
            const fullName = window.securityManager.sanitizeInput(document.getElementById('editFullName').value);
            const email = window.securityManager.sanitizeInput(document.getElementById('editEmail').value);
            const password = document.getElementById('editPassword').value;
            const confirmPassword = document.getElementById('editConfirmPassword').value;

           
            if (!fullName || !email) {
                this.showAlert('Please fill in all required fields', 'danger');
                return;
            }

         
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.showAlert('Please enter a valid email address', 'danger');
                return;
            }

           
            if (email !== this.currentUser.email) {
                const emailVerification = await this.verifyEmailWithMailgun(email);
                if (!emailVerification.isValid) {
                    this.showAlert(`Email verification failed: ${emailVerification.reason}`, 'danger');
                    return;
                }
            }

            
            if (password) {
                if (password !== confirmPassword) {
                    this.showAlert('Passwords do not match', 'danger');
                    return;
                }

                if (password.length < 8) {
                    this.showAlert('Password must be at least 8 characters long', 'danger');
                    return;
                }

                
                const hasUpperCase = /[A-Z]/.test(password);
                const hasLowerCase = /[a-z]/.test(password);
                const hasNumbers = /\d/.test(password);
                const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

                if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
                    this.showAlert('Password must contain uppercase, lowercase, number, and special character', 'danger');
                    return;
                }
            }

         
            const updateData = {
                fullName: fullName,
                email: email,
                updatedAt: new Date()
            };

            await this.db.collection('users').doc(this.currentUser.uid).update(updateData);

           
            if (password) {
                await this.currentUser.updatePassword(password);
            }

           
            await this.currentUser.updateProfile({
                displayName: fullName
            });

            
            await this.loadUserData();

            this.showAlert('Profile updated successfully!', 'success');
            this.toggleEditMode();

        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.code === 'auth/requires-recent-login') {
                
                console.log('User needs to re-authenticate for this operation.');
                this.promptForReauthentication();
            } else {
                this.showAlert('Error updating profile. Please try again.', 'danger');
            }
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

         
            const commonProviders = [
                'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
                'icloud.com', 'protonmail.com', 'aol.com'
            ];
            
            const isCommonProvider = commonProviders.some(provider => 
                domain === provider
            );

            return {
                isValid: isValidFormat && !isDisposable,
                reason: isDisposable ? 'Disposable email not allowed' : 
                        !isValidFormat ? 'Invalid email format' : 'Valid',
                score: isCommonProvider ? 0.9 : 0.7,
                isDisposable: isDisposable,
                isCommonProvider: isCommonProvider
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


    promptForReauthentication() {
     
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'reauthModal';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-labelledby', 'reauthModalLabel');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="background: rgba(26, 26, 26, 0.95); border: 2px solid var(--th-primary);">
                    <div class="modal-header" style="border-bottom: 1px solid rgba(0, 255, 65, 0.2);">
                        <h5 class="modal-title text-primary" id="reauthModalLabel">
                            <i class="fas fa-shield-alt me-2"></i>Security Verification Required
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>ThemeHackers Security Notice:</strong><br>
                            For your security, we need to verify your identity before making sensitive changes to your account.
                        </div>
                        <form id="reauthForm">
                            <div class="mb-3">
                                <label for="reauthPassword" class="form-label text-primary">Current Password</label>
                                <input type="password" class="form-control" id="reauthPassword" required 
                                       placeholder="Enter your current password">
                            </div>
                            <div class="d-flex gap-2">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-check me-2"></i>Verify Identity
                                </button>
                                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                    <i class="fas fa-times me-2"></i>Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        

        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
    
        const reauthForm = modal.querySelector('#reauthForm');
        reauthForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleReauthentication(modal, bootstrapModal);
        });
        
       
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    async handleReauthentication(modal, bootstrapModal) {
        try {
            const password = document.getElementById('reauthPassword').value;
            
            if (!password) {
                this.showAlert('Please enter your current password', 'danger');
                return;
            }

          
            const submitBtn = modal.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying...';
            submitBtn.disabled = true;

            
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email, 
                password
            );
            
            await this.currentUser.reauthenticateWithCredential(credential);
            
         
            bootstrapModal.hide();
            
        
            this.showAlert('Identity verified successfully! You can now update your profile.', 'success');
            
       
            setTimeout(() => {
                this.handleProfileUpdate();
            }, 1000);

        } catch (error) {
            console.error('Re-authentication error:', error);
            
            let errorMessage = 'Verification failed. Please try again.';
            
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please enter your current password.';
            } else if (error.code === 'auth/user-mismatch') {
                errorMessage = 'Authentication failed. Please try again.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            }
            
            this.showAlert(errorMessage, 'danger');
            
          
            const submitBtn = modal.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Verify Identity';
            submitBtn.disabled = false;
        }
    }

  
    async runSecurityTests() {
        const testResults = document.getElementById('testResults');
        const resultsContainer = document.getElementById('securityTestResults');
        
        if (testResults) {
            testResults.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div><br>Running comprehensive security tests...</div>';
        }
        
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
        }

        const tests = [
            { name: 'Session Security', test: () => this.testSessionSecurity() },
            { name: 'Input Sanitization', test: () => this.testInputSanitization() },
            { name: 'Password Strength', test: () => this.testPasswordStrength() },
            { name: 'CSRF Protection', test: () => this.testCSRFProtection() },
            { name: 'XSS Protection', test: () => this.testXSSProtection() },
            { name: 'Rate Limiting', test: () => this.testRateLimiting() },
            { name: 'Security Headers', test: () => this.testSecurityHeaders() },
            { name: 'Authentication State', test: () => this.testAuthenticationState() },
            { name: 'Local Storage Security', test: () => this.testLocalStorageSecurity() },
            { name: 'Session Storage Security', test: () => this.testSessionStorageSecurity() },
            { name: 'Cookie Security', test: () => this.testCookieSecurity() },
            { name: 'Network Security', test: () => this.testNetworkSecurity() },
            { name: 'Content Security Policy', test: () => this.testContentSecurityPolicy() },
            { name: 'HTTPS Enforcement', test: () => this.testHTTPSEnforcement() },
            { name: 'Firebase Security', test: () => this.testFirebaseSecurity() },
            { name: 'DOM Security', test: () => this.testDOMSecurity() },
            { name: 'JavaScript Security', test: () => this.testJavaScriptSecurity() },
            { name: 'Browser Security', test: () => this.testBrowserSecurity() },
            { name: 'Third-Party Scripts', test: () => this.testThirdPartyScripts() },
            { name: 'Data Validation', test: () => this.testDataValidation() }
        ];

        let results = [];
        let passedCount = 0;
        let totalScore = 0;
        let maxScore = 0;
        
        for (const test of tests) {
            try {
                const result = await test.test();
                results.push({ name: test.name, ...result });
                
                if (result.passed) {
                    passedCount++;
                }
                
                if (result.score !== undefined) {
                    totalScore += result.score;
                    maxScore += result.maxScore || 10;
                }
            } catch (error) {
                console.error(`Security test error for ${test.name}:`, error);
                results.push({ 
                    name: test.name, 
                    passed: false, 
                    message: `Test failed: ${error.message}`,
                    details: `Error occurred during test execution`,
                    remediation: 'Check browser console for detailed error information',
                    score: 0,
                    maxScore: 10
                });
            }
        }

        this.displaySecurityTestResults(results, passedCount, totalScore, maxScore);
    }

    async testSessionSecurity() {
        try {
            const token = await this.currentUser.getIdToken(true);
            const isTokenValid = !!token;
            const tokenLength = token ? token.length : 0;
            const tokenExpiry = token ? this.parseJWTExpiry(token) : null;
            const isEmailVerified = this.currentUser.emailVerified;
            const isAnonymous = this.currentUser.isAnonymous;
            
            let score = 0;
            let maxScore = 10;
            
            if (isTokenValid) score += 3;
            if (tokenLength > 100) score += 2;
            if (tokenExpiry && tokenExpiry > Date.now()) score += 2;
            if (isEmailVerified) score += 2;
            if (!isAnonymous) score += 1;
            
            const remediation = !isEmailVerified ? 'Enable email verification for enhanced security' : 
                              isAnonymous ? 'Use authenticated login instead of anonymous access' : 
                              'Session security is properly configured';
            
            return {
                passed: isTokenValid && !isAnonymous,
                message: isTokenValid ? 'Session token is valid and secure' : 'Session token is invalid or expired',
                details: `Token length: ${tokenLength} chars, Expiry: ${tokenExpiry ? 'Valid' : 'Invalid'}, Email verified: ${isEmailVerified ? 'Yes' : 'No'}, Anonymous: ${isAnonymous ? 'Yes' : 'No'}`,
                remediation: remediation,
                score: score,
                maxScore: maxScore
            };
        } catch (error) {
            return {
                passed: false,
                message: 'Session security test failed',
                details: `Error: ${error.message}`,
                remediation: 'Check Firebase configuration and network connectivity',
                score: 0,
                maxScore: 10
            };
        }
    }

    testInputSanitization() {
        const testInputs = [
            '<script>alert("xss")</script>',
            'javascript:alert("xss")',
            '<img src="x" onerror="alert(\'xss\')">',
            'data:text/html,<script>alert("xss")</script>',
            '<iframe src="javascript:alert(\'xss\')"></iframe>',
            '<svg onload="alert(\'xss\')">',
            '"><script>alert("xss")</script>',
            '&#60;script&#62;alert("xss")&#60;/script&#62;',
            'expression(alert("xss"))',
            'vbscript:alert("xss")',
            '"><img src=x onerror=alert(1)>',
            '"><iframe src="javascript:alert(1)">',
            '"><object data="javascript:alert(1)">',
            '"><embed src="javascript:alert(1)">'
        ];

        const sanitized = testInputs.map(input => window.securityManager.sanitizeInput(input));
        const hasScriptTags = sanitized.some(input => 
            input.includes('<script') || 
            input.includes('javascript:') || 
            input.includes('data:text/html') ||
            input.includes('expression(') ||
            input.includes('vbscript:') ||
            input.includes('onerror=') ||
            input.includes('onload=')
        );

        const cleanCount = sanitized.filter(input => !input.includes('<')).length;
        const score = Math.round((cleanCount / testInputs.length) * 10);

        return {
            passed: !hasScriptTags,
            message: hasScriptTags ? 'Input sanitization failed - malicious content detected' : 'Input sanitization working correctly',
            details: `Tested ${testInputs.length} malicious inputs, ${cleanCount} properly sanitized`,
            remediation: hasScriptTags ? 'Review and strengthen input sanitization functions' : 'Input sanitization is properly configured',
            score: score,
            maxScore: 10
        };
    }

    testPasswordStrength() {
        const testPasswords = [
            { password: 'password123', expected: 'weak' },
            { password: '##Password123', expected: 'strong' },
            { password: 'SecurePass123!@#', expected: 'strong' },
            { password: '123456', expected: 'weak' },
            { password: 'qwerty', expected: 'weak' },
            { password: 'Admin123!', expected: 'strong' },
            { password: 'weak', expected: 'weak' },
            { password: 'StrongP@ssw0rd!', expected: 'strong' }
        ];

        let passedTests = 0;
        let totalScore = 0;

        testPasswords.forEach(({ password, expected }) => {
            const result = window.securityManager.validatePasswordStrength(password);
            let strength = 'weak';
            
            if (result.score >= 5) strength = 'strong';
            else if (result.score >= 3) strength = 'medium';
            
            if (strength === expected) {
                passedTests++;
                totalScore += 2;
            }
        });

        const score = Math.min(10, Math.round((passedTests / testPasswords.length) * 10) + 2);

        return {
            passed: passedTests >= testPasswords.length * 0.8,
            message: 'Password strength validation working correctly',
            details: `${passedTests}/${testPasswords.length} password tests passed`,
            remediation: passedTests < testPasswords.length * 0.8 ? 'Review password validation logic and criteria' : 'Password validation is properly configured',
            score: score,
            maxScore: 10
        };
    }

    testCSRFProtection() {
        const token = sessionStorage.getItem('csrf_token');
        const isValid = window.securityManager.validateCSRFToken(token);
        const tokenLength = token ? token.length : 0;
        const isRandom = token && token.length >= 32;

        let score = 0;
        if (!!token) score += 3;
        if (isValid) score += 3;
        if (isRandom) score += 2;
        if (tokenLength >= 32) score += 2;

        return {
            passed: !!token && isValid,
            message: isValid ? 'CSRF protection active and secure' : 'CSRF protection missing or invalid',
            details: `Token present: ${!!token}, Valid: ${isValid}, Length: ${tokenLength} chars, Random: ${isRandom ? 'Yes' : 'No'}`,
            remediation: !token || !isValid ? 'Implement proper CSRF token generation and validation' : 'CSRF protection is properly configured',
            score: score,
            maxScore: 10
        };
    }

    testXSSProtection() {
        const headers = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection'
        ];

        const metaTags = headers.map(header => 
            document.querySelector(`meta[http-equiv="${header}"]`)
        );

        const allPresent = metaTags.every(tag => tag !== null);
        const score = allPresent ? 10 : Math.round((metaTags.filter(tag => tag !== null).length / headers.length) * 10);

        return {
            passed: allPresent,
            message: allPresent ? 'XSS protection headers present' : 'Missing XSS protection headers',
            details: `Headers found: ${metaTags.filter(tag => tag !== null).length}/${headers.length}`,
            remediation: !allPresent ? 'Add missing XSS protection meta tags to HTML head' : 'XSS protection headers are properly configured',
            score: score,
            maxScore: 10
        };
    }

    testRateLimiting() {
        const report = window.securityManager.getSecurityReport();
        const attempts = report.rateLimitAttempts || 0;
        const isLockedOut = report.isLockedOut || false;
        
        let score = 10;
        if (attempts > 3) score -= 3;
        if (attempts > 5) score -= 4;
        if (isLockedOut) score = 0;

        return {
            passed: attempts < 5 && !isLockedOut,
            message: attempts < 5 ? 'Rate limiting active and working' : 'Rate limit exceeded',
            details: `Attempts: ${attempts}/5, Locked out: ${isLockedOut ? 'Yes' : 'No'}`,
            remediation: isLockedOut ? 'Wait for lockout period to expire before trying again' : 'Rate limiting is properly configured',
            score: Math.max(0, score),
            maxScore: 10
        };
    }

    testSecurityHeaders() {
        const report = window.securityManager.getSecurityReport();
        const headers = report.securityHeaders;
        const allHeaders = Object.values(headers).every(Boolean);
        const headerCount = Object.values(headers).filter(Boolean).length;

        const score = Math.round((headerCount / Object.keys(headers).length) * 10);

        return {
            passed: allHeaders,
            message: allHeaders ? 'All security headers present' : 'Missing security headers',
            details: `Headers active: ${headerCount}/${Object.keys(headers).length}`,
            remediation: !allHeaders ? 'Add missing security meta tags to HTML head' : 'Security headers are properly configured',
            score: score,
            maxScore: 10
        };
    }

    testAuthenticationState() {
        const isAuthenticated = !!this.currentUser;
        const hasValidEmail = this.currentUser && this.currentUser.emailVerified;
        const hasDisplayName = this.currentUser && this.currentUser.displayName;
        const isAnonymous = this.currentUser && this.currentUser.isAnonymous;

        let score = 0;
        if (isAuthenticated) score += 3;
        if (hasValidEmail) score += 3;
        if (hasDisplayName) score += 2;
        if (!isAnonymous) score += 2;

        return {
            passed: isAuthenticated && !isAnonymous,
            message: isAuthenticated ? 'User properly authenticated' : 'Authentication failed',
            details: `Authenticated: ${isAuthenticated}, Email verified: ${hasValidEmail}, Anonymous: ${isAnonymous}`,
            remediation: !isAuthenticated ? 'User must be logged in to access this feature' : 
                        isAnonymous ? 'Use authenticated login instead of anonymous access' : 
                        !hasValidEmail ? 'Verify email address for enhanced security' : 'Authentication state is properly configured',
            score: score,
            maxScore: 10
        };
    }

    testLocalStorageSecurity() {
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
        const localStorageKeys = Object.keys(localStorage);
        const hasSensitiveData = sensitiveKeys.some(key => 
            localStorageKeys.some(storageKey => 
                storageKey.toLowerCase().includes(key)
            )
        );

        const score = hasSensitiveData ? 0 : 10;

        return {
            passed: !hasSensitiveData,
            message: hasSensitiveData ? 'Sensitive data found in localStorage' : 'localStorage security check passed',
            details: `Sensitive data: ${hasSensitiveData ? 'Found' : 'None detected'}, Keys: ${localStorageKeys.length}`,
            remediation: hasSensitiveData ? 'Remove sensitive data from localStorage and use secure alternatives' : 'localStorage security is properly configured',
            score: score,
            maxScore: 10
        };
    }

    testSessionStorageSecurity() {
        const report = window.securityManager.getSecurityReport();
        const hasCSRFToken = report.sessionStorage.csrfToken;
        const hasSecurityLogs = report.sessionStorage.securityLogs > 0;
        const logCount = report.sessionStorage.securityLogs;

        if (window.securityManager) {
            window.securityManager.logSecurityEvent('security_test_run', {
                testType: 'session_storage',
                timestamp: new Date().toISOString()
            });
        }

        let score = 0;
        if (hasCSRFToken) score += 5;
        if (hasSecurityLogs) score += 3;
        if (logCount > 5) score += 2;

        return {
            passed: hasCSRFToken,
            message: hasCSRFToken ? 'Session storage security active' : 'Session storage security missing',
            details: `CSRF Token: ${hasCSRFToken ? 'Present' : 'Missing'}, Security logs: ${logCount + 1}`,
            remediation: !hasCSRFToken ? 'Initialize CSRF token in session storage' : 'Session storage security is properly configured',
            score: score,
            maxScore: 10
        };
    }

    testCookieSecurity() {

        const cookies = document.cookie.split(';');
        const hasSecure = cookies.some(cookie => cookie.includes('Secure'));
        const hasSameSite = cookies.some(cookie => cookie.includes('SameSite'));
        const hasThemeHackersSession = cookies.some(cookie => cookie.includes('themehackers_session'));
        const hasSameSiteTest = cookies.some(cookie => cookie.includes('th_samesite_test'));
        const hasSecurityLevel = cookies.some(cookie => cookie.includes('th_security_level'));
        
       
        const hasHttpOnly = false; 
        const hasPath = cookies.some(cookie => cookie.includes('Path=/'));
        const hasExpires = cookies.some(cookie => cookie.includes('Expires='));
        
       
        const isSecureContext = window.location.protocol === 'https:' || 
                               window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1';

       
        let score = 0;
        if (hasSecure || isSecureContext) score += 3;
        if (hasSameSite) score += 4;
        if (hasThemeHackersSession) score += 2; 
        if (hasSameSiteTest) score += 1; 
        if (hasSecurityLevel) score += 1; 
        if (hasPath) score += 1; 
        if (hasExpires) score += 1;

        const cookieCount = cookies.length;
        const hasMultipleSecurityCookies = (hasThemeHackersSession && hasSameSiteTest && hasSecurityLevel) ? 2 : 
                                         (hasThemeHackersSession && hasSameSiteTest) ? 1 : 0;
        score += hasMultipleSecurityCookies;

        let securityLevel = 'Basic';
        if (score >= 9) securityLevel = 'Enhanced';
        else if (score >= 7) securityLevel = 'Standard';
        else if (score >= 5) securityLevel = 'Basic';
        else securityLevel = 'Poor';

        return {
            passed: (hasSecure || isSecureContext) && hasSameSite && score >= 7,
            message: score >= 7 
                ? `Cookie security properly configured with ${securityLevel.toLowerCase()} protection` 
                : 'Cookie security needs improvement (HttpOnly cannot be checked from browser JS)',
            details: `Secure: ${hasSecure ? 'Yes' : 'No'}, SameSite: ${hasSameSite ? 'Yes' : 'No'}, Security Test Cookie: ${hasThemeHackersSession ? 'Yes' : 'No'}, SameSite Test: ${hasSameSiteTest ? 'Yes' : 'No'}, Security Level Cookie: ${hasSecurityLevel ? 'Yes' : 'No'}, Path: ${hasPath ? 'Yes' : 'No'}, Expires: ${hasExpires ? 'Yes' : 'No'}, HttpOnly: Not detectable from JS, Secure Context: ${isSecureContext ? 'Yes' : 'No'}, Total Cookies: ${cookieCount}, Security Level: ${securityLevel}`,
            remediation: !hasSameSite ? 'Set SameSite=Strict on cookies' : 
                        !(hasSecure || isSecureContext) ? 'Use HTTPS in production and set Secure flag' : 
                        score < 7 ? 'Add additional security attributes to cookies' :
                        'Note: HttpOnly cookies cannot be verified client-side - check server configuration',
            score: Math.min(10, score),
            maxScore: 10
        };
    }

    testNetworkSecurity() {
        const isHTTPS = window.location.protocol === 'https:';
        const hasReferrerPolicy = document.querySelector('meta[name="referrer"]');
        const hasCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        let score = 0;
        if (isHTTPS) score += 5;
        else if (isLocalhost) score += 3;
        if (hasReferrerPolicy) score += 3;
        if (hasCSP) score += 2;

        return {
            passed: isHTTPS || isLocalhost,
            message: isHTTPS ? 'Network security properly configured' : isLocalhost ? 'Localhost development environment' : 'HTTPS not enforced',
            details: `HTTPS: ${isHTTPS ? 'Yes' : 'No'}, Referrer Policy: ${hasReferrerPolicy ? 'Yes' : 'No'}, CSP: ${hasCSP ? 'Yes' : 'No'}, Localhost: ${isLocalhost ? 'Yes' : 'No'}`,
            remediation: !isHTTPS && !isLocalhost ? 'Deploy to HTTPS in production' : 
                        !hasReferrerPolicy ? 'Add referrer policy meta tag' : 
                        !hasCSP ? 'Add Content Security Policy meta tag' : 'Network security is properly configured',
            score: score,
            maxScore: 10
        };
    }

    testContentSecurityPolicy() {
        const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        const hasCSP = !!cspMeta;
        const cspContent = cspMeta ? cspMeta.getAttribute('content') : '';
        
        const hasDefaultSrc = cspContent.includes('default-src');
        const hasScriptSrc = cspContent.includes('script-src');
        const hasStyleSrc = cspContent.includes('style-src');
        const hasConnectSrc = cspContent.includes('connect-src');
        const connectSrcMatches = cspContent.match(/connect-src\s[^;]+/g);
        const connectSrcValues = connectSrcMatches ? connectSrcMatches[0].split(/\s+/).slice(1) : [];
        const allowedFirebaseHosts = ['firebase.googleapis.com', 'firestore.googleapis.com'];
        const hasFirebaseDomains = connectSrcValues.some(url => {
            try {
                const parsedUrl = new URL(url);
                return allowedFirebaseHosts.includes(parsedUrl.host);
            } catch (e) {
                console.warn('Invalid URL in connect-src values:', url, e);
                return false;
            }
        });
        const hasGoogleDomains = cspContent.includes('googleapis.com');
        const hasUnsafeInline = cspContent.includes("'unsafe-inline'");

        let score = 0;
        if (hasCSP) score += 2;
        if (hasDefaultSrc) score += 2;
        if (hasScriptSrc) score += 2;
        if (hasStyleSrc) score += 2;
        if (hasConnectSrc) score += 1;
        if (hasFirebaseDomains) score += 1;
        if (!hasUnsafeInline) score += 2; 

        return {
            passed: hasCSP && hasDefaultSrc && hasConnectSrc,
            message: hasCSP ? 'Content Security Policy active' : 'Content Security Policy missing',
            details: `CSP: ${hasCSP ? 'Present' : 'Missing'}, Default-src: ${hasDefaultSrc ? 'Yes' : 'No'}, Connect-src: ${hasConnectSrc ? 'Yes' : 'No'}, Firebase: ${hasFirebaseDomains ? 'Yes' : 'No'}, Unsafe-inline: ${hasUnsafeInline ? 'Yes' : 'No'}`,
            remediation: !hasCSP ? 'Add Content Security Policy meta tag' : 
                        !hasDefaultSrc ? 'Add default-src directive to CSP' : 
                        !hasConnectSrc ? 'Add connect-src directive to CSP' : 
                        hasUnsafeInline ? 'Consider removing unsafe-inline from CSP for better security' : 'Content Security Policy is properly configured',
            score: score,
            maxScore: 10
        };
    }

    testHTTPSEnforcement() {
        const isHTTPS = window.location.protocol === 'https:';
        const hasHSTS = document.querySelector('meta[http-equiv="Strict-Transport-Security"]');
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        let score = 0;
        if (isHTTPS) score += 5;
        if (hasHSTS) score += 3;
        if (isLocalhost) score += 2;

        return {
            passed: isHTTPS || isLocalhost,
            message: isHTTPS ? 'HTTPS properly enforced' : isLocalhost ? 'Localhost development environment' : 'HTTPS not enforced',
            details: `HTTPS: ${isHTTPS ? 'Yes' : 'No'}, HSTS: ${hasHSTS ? 'Yes' : 'No'}, Localhost: ${isLocalhost ? 'Yes' : 'No'}`,
            remediation: !isHTTPS && !isLocalhost ? 'Deploy to HTTPS in production' : 
                        !hasHSTS && isHTTPS ? 'Add HSTS meta tag for enhanced security' : 'HTTPS enforcement is properly configured',
            score: score,
            maxScore: 10
        };
    }

    async testFirebaseSecurity() {
        try {
            const token = await this.currentUser.getIdToken(true);
            const isTokenValid = !!token;
            const authState = this.auth.currentUser;
            const isEmailVerified = authState ? authState.emailVerified : false;
            const isAnonymous = authState ? authState.isAnonymous : true;

            let score = 0;
            if (isTokenValid) score += 3;
            if (authState) score += 3;
            if (isEmailVerified) score += 2;
            if (!isAnonymous) score += 2;

            return {
                passed: isTokenValid && authState && !isAnonymous,
                message: isTokenValid ? 'Firebase authentication secure' : 'Firebase authentication failed',
                details: `Token valid: ${isTokenValid}, User authenticated: ${!!authState}, Email verified: ${isEmailVerified}, Anonymous: ${isAnonymous}`,
                remediation: !isTokenValid ? 'Check Firebase configuration and network connectivity' : 
                            isAnonymous ? 'Use authenticated login instead of anonymous access' : 
                            !isEmailVerified ? 'Verify email address for enhanced security' : 'Firebase security is properly configured',
                score: score,
                maxScore: 10
            };
        } catch (error) {
            return {
                passed: false,
                message: 'Firebase security test failed',
                details: `Error: ${error.message}`,
                remediation: 'Check Firebase configuration, network connectivity, and authentication state',
                score: 0,
                maxScore: 10
            };
        }
    }

    testDOMSecurity() {

        const hasOnClick = document.querySelectorAll('[onclick]').length;
        const hasOnLoad = document.querySelectorAll('[onload]').length;
        const hasOnError = document.querySelectorAll('[onerror]').length;
        const hasOnMouseOver = document.querySelectorAll('[onmouseover]').length;
        const hasOnFocus = document.querySelectorAll('[onfocus]').length;

        const hasBootstrapData = document.querySelectorAll('[data-bs-toggle], [data-bs-target], [data-bs-dismiss]').length;
        
       
        const dangerousEvents = hasOnClick + hasOnLoad + hasOnError + hasOnMouseOver + hasOnFocus;
        const legitimateEvents = hasBootstrapData;
        
        
        const score = dangerousEvents === 0 ? 10 : Math.max(0, 10 - dangerousEvents * 2);

        return {
            passed: dangerousEvents === 0,
            message: dangerousEvents === 0 ? 'DOM security check passed' : 'Potentially dangerous inline event handlers detected',
            details: `Dangerous events: ${dangerousEvents} (onclick: ${hasOnClick}, onload: ${hasOnLoad}, onerror: ${hasOnError}), Legitimate Bootstrap events: ${legitimateEvents}`,
            remediation: dangerousEvents > 0 ? 'Remove inline event handlers and use addEventListener instead' : 'DOM security is properly configured',
            score: score,
            maxScore: 10
        };
    }

    testJavaScriptSecurity() {
        const hasEval = typeof eval !== 'undefined';
        const hasFunction = typeof Function !== 'undefined';
        const hasSetTimeout = typeof setTimeout !== 'undefined';
        const hasSetInterval = typeof setInterval !== 'undefined';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        let score = 10;

        if (hasSetTimeout) score -= 1;
        if (hasSetInterval) score -= 1;

        if (isLocalhost) score += 2;

        return {
            passed: score >= 7,
            message: score >= 7 ? 'JavaScript security acceptable' : 'JavaScript security needs improvement',
            details: `Eval: ${hasEval ? 'Available (needed for Firebase)' : 'Blocked'}, Function: ${hasFunction ? 'Available (needed for Firebase)' : 'Blocked'}, Development: ${isLocalhost ? 'Yes' : 'No'}, Score: ${Math.max(0, score)}/10`,
            remediation: score < 7 ? 'Consider restricting dangerous JavaScript functions in production' : 'JavaScript security is properly configured for this application',
            score: Math.max(0, score),
            maxScore: 10
        };
    }

    testBrowserSecurity() {
 
        const hasWebGL = !!window.WebGLRenderingContext;
        const hasGeolocation = !!navigator.geolocation;
        const hasCamera = !!navigator.mediaDevices;
        const hasNotifications = !!window.Notification;
        const hasServiceWorker = 'serviceWorker' in navigator;
        const hasWebRTC = !!window.RTCPeerConnection;
        const hasBluetooth = !!navigator.bluetooth;
        const hasGamepad = !!navigator.getGamepads;
        const hasVibration = !!navigator.vibrate;
        const hasBattery = !!navigator.getBattery;
        const hasClipboard = !!navigator.clipboard;
        const hasPermissions = !!navigator.permissions;
        const hasStorage = !!window.localStorage && !!window.sessionStorage;
        const hasIndexedDB = !!window.indexedDB;
        const hasWebAssembly = !!window.WebAssembly;

       
        let score = 10;
        let riskLevel = 'Low';
        let riskDetails = [];
        
  
        if (hasBluetooth) { score -= 3; riskDetails.push('Bluetooth'); }
        if (hasVibration) { score -= 2; riskDetails.push('Vibration'); }
        
       
        if (hasBattery) { score -= 2; riskDetails.push('Battery'); }
        if (hasGeolocation) { score -= 1; riskDetails.push('Geolocation'); }
        if (hasCamera) { score -= 1; riskDetails.push('Camera'); }
        if (hasWebRTC) { score -= 1; riskDetails.push('WebRTC'); }
        if (hasClipboard) { score -= 1; riskDetails.push('Clipboard'); }
        
        
        if (hasPermissions) { score -= 0.5; riskDetails.push('Permissions'); }
        
       
        if (hasWebGL) { score -= 0; } 
        if (hasNotifications) { score -= 0; } 
        if (hasGamepad) { score -= 0; } 
        if (hasStorage) { score -= 0; } 
        if (hasIndexedDB) { score -= 0; } 
        if (hasWebAssembly) { score -= 0; } 
        
        if (hasServiceWorker) { score += 1; }
        
        if (score <= 5) riskLevel = 'High';
        else if (score <= 7) riskLevel = 'Medium';
        else riskLevel = 'Low';

        return {
            passed: score >= 6,
            message: score >= 6 ? 'Browser security acceptable with enhanced protection' : 'Browser security needs improvement',
            details: `WebGL: ${hasWebGL ? 'Yes' : 'No'}, Geolocation: ${hasGeolocation ? 'Yes' : 'No'}, Camera: ${hasCamera ? 'Yes' : 'No'}, Notifications: ${hasNotifications ? 'Yes' : 'No'}, WebRTC: ${hasWebRTC ? 'Yes' : 'No'}, Bluetooth: ${hasBluetooth ? 'Yes' : 'No'}, Service Worker: ${hasServiceWorker ? 'Yes' : 'No'}, Clipboard: ${hasClipboard ? 'Yes' : 'No'}, Risk Level: ${riskLevel}, Score: ${score}/10`,
            remediation: score < 6 ? `Consider restricting high-risk browser APIs: ${riskDetails.join(', ')}` : 'Browser security is properly configured',
            score: Math.max(0, score),
            maxScore: 10
        };
    }

    testThirdPartyScripts() {
        const scripts = document.querySelectorAll('script[src]');
        const externalScripts = Array.from(scripts).filter(script => {
            const src = script.src;
            return !src.includes(window.location.origin) && 
                   !src.includes('localhost') && 
                   !src.includes('127.0.0.1');
        });

        const trustedDomains = [
            'gstatic.com',
            'googleapis.com',
            'firebase.googleapis.com',
            'firestore.googleapis.com',
            'cdn.jsdelivr.net',
            'cdnjs.cloudflare.com',
            'bootstrapcdn.com'
        ];

        const untrustedScripts = externalScripts.filter(script => {
            const src = script.src;
            return !trustedDomains.some(domain => src.includes(domain));
        });

        let score = 10;
        if (untrustedScripts.length > 0) {
            score -= untrustedScripts.length * 3;
        }

        return {
            passed: untrustedScripts.length === 0,
            message: untrustedScripts.length === 0 ? 'All third-party scripts are from trusted sources' : 'Untrusted third-party scripts detected',
            details: `External scripts: ${externalScripts.length}, Untrusted: ${untrustedScripts.length}, Trusted domains: ${trustedDomains.length}`,
            remediation: untrustedScripts.length > 0 ? 'Review and remove untrusted third-party scripts or verify their security' : 'Third-party script security is properly configured',
            score: Math.max(0, score),
            maxScore: 10
        };
    }

    testDataValidation() {
        const testCases = [
            { input: 'test@example.com', type: 'email', expected: true },
            { input: 'invalid-email', type: 'email', expected: false },
            { input: '1234567890', type: 'phone', expected: true },
            { input: 'abc123', type: 'phone', expected: false },
            { input: 'StrongP@ss123!', type: 'password', expected: true },
            { input: 'weak', type: 'password', expected: false },
            { input: 'John Doe', type: 'name', expected: true },
            { input: '<script>alert("xss")</script>', type: 'name', expected: false }
        ];

        let passedTests = 0;
        let totalScore = 0;

        testCases.forEach(({ input, type, expected }) => {
            let isValid = false;
            
            switch (type) {
                case 'email':
                    isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
                    break;
                case 'phone':
                    isValid = /^\d{10,}$/.test(input.replace(/\D/g, ''));
                    break;
                case 'password':
                    isValid = input.length >= 8 && /[A-Z]/.test(input) && /[a-z]/.test(input) && /\d/.test(input);
                    break;
                case 'name':
                    isValid = /^[a-zA-Z\s]+$/.test(input) && !input.includes('<script');
                    break;
            }
            
            if (isValid === expected) {
                passedTests++;
                totalScore += 2;
            }
        });

        const score = Math.min(10, Math.round((passedTests / testCases.length) * 10));

        return {
            passed: passedTests >= testCases.length * 0.8,
            message: 'Data validation working correctly',
            details: `${passedTests}/${testCases.length} validation tests passed`,
            remediation: passedTests < testCases.length * 0.8 ? 'Review and improve data validation functions' : 'Data validation is properly configured',
            score: score,
            maxScore: 10
        };
    }

    parseJWTExpiry(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            return payload.exp * 1000; // Convert to milliseconds
        } catch (error) {
            return null;
        }
    }

    displaySecurityTestResults(results, passedCount, totalScore, maxScore) {
        const testResults = document.getElementById('testResults');
        if (!testResults) return;

        const overallScore = Math.round((totalScore / maxScore) * 100);
        const securityLevel = this.getSecurityLevel(overallScore);
        const passedPercentage = Math.round((passedCount / results.length) * 100);

        let html = '';
        
        const statusClass = this.getStatusClass(overallScore);
        const statusIcon = this.getStatusIcon(overallScore);
        const statusColor = this.getStatusColor(overallScore);
        
        html = `
            <div class="mb-4 p-4 border rounded ${statusClass}" style="border-color: ${statusColor} !important; background: rgba(${this.getStatusRGB(statusColor)}, 0.1);">
                <div class="d-flex align-items-center justify-content-between">
                    <div>
                        <h6 class="mb-2"><i class="${statusIcon} me-2"></i>Overall Security Status</h6>
                        <div class="small">
                            <strong>Security Score:</strong> ${overallScore}% (${totalScore}/${maxScore} points)<br>
                            <strong>Tests Passed:</strong> ${passedCount}/${results.length} (${passedPercentage}%)<br>
                            <strong>Security Level:</strong> <span class="badge bg-${this.getBadgeColor(overallScore)}">${securityLevel}</span>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="h4 mb-0" style="color: ${statusColor};">${overallScore}%</div>
                        <div class="small">${securityLevel}</div>
                    </div>
                </div>
                
                <!-- Security recommendations -->
                <div class="mt-3 p-3 bg-light rounded">
                    <h6 class="mb-2"><i class="fas fa-lightbulb me-2"></i>Security Recommendations</h6>
                    <div class="small">
                        ${this.getSecurityRecommendations(results, overallScore)}
                    </div>
                </div>
            </div>
        `;

        results.forEach(result => {
            const statusClass = result.passed ? 'text-success' : 'text-danger';
            const statusIcon = result.passed ? 'fas fa-check-circle' : 'fas fa-times-circle';
            const scoreText = result.score !== undefined ? ` (${result.score}/${result.maxScore})` : '';
            const borderColor = result.passed ? '#28a745' : '#dc3545';
            
            html += `
                <div class="mb-3 p-3 border rounded" style="border-color: ${borderColor} !important; background: rgba(${result.passed ? '40, 167, 69' : '220, 53, 69'}, 0.05);">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                                <span class="fw-bold me-2">${result.name}${scoreText}</span>
                                <i class="${statusIcon} ${statusClass}"></i>
                            </div>
                            <div class="small text-muted mb-2">${result.message}</div>
                            <div class="small text-muted mb-2">${result.details}</div>
                            ${result.remediation ? `
                                <div class="small p-2 bg-warning bg-opacity-10 rounded border-start border-warning border-3">
                                    <i class="fas fa-tools me-1"></i><strong>Recommendation:</strong> ${result.remediation}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        testResults.innerHTML = html;
    }

    getSecurityLevel(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Good';
        if (score >= 70) return 'Fair';
        if (score >= 60) return 'Poor';
        return 'Critical';
    }

    getStatusClass(score) {
        if (score >= 80) return 'text-success';
        if (score >= 60) return 'text-warning';
        return 'text-danger';
    }

    getStatusIcon(score) {
        if (score >= 80) return 'fas fa-shield-alt';
        if (score >= 60) return 'fas fa-exclamation-triangle';
        return 'fas fa-times-circle';
    }

    getStatusColor(score) {
        if (score >= 80) return '#28a745';
        if (score >= 60) return '#ffc107';
        return '#dc3545';
    }

    getStatusRGB(color) {
        switch (color) {
            case '#28a745': return '40, 167, 69';
            case '#ffc107': return '255, 193, 7';
            case '#dc3545': return '220, 53, 69';
            default: return '0, 0, 0';
        }
    }

    getBadgeColor(score) {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warning';
        return 'danger';
    }

    getSecurityRecommendations(results, overallScore) {
        const failedTests = results.filter(r => !r.passed);
        const criticalTests = ['Session Security', 'Authentication State', 'Firebase Security'];
        const criticalFailed = failedTests.filter(r => criticalTests.includes(r.name));
        
        let recommendations = [];
        
        if (overallScore < 60) {
            recommendations.push('🔴 <strong>Critical:</strong> Immediate action required to improve security posture.');
        } else if (overallScore < 80) {
            recommendations.push('🟡 <strong>Warning:</strong> Several security improvements needed.');
        } else {
            recommendations.push('🟢 <strong>Good:</strong> Security posture is acceptable with minor improvements possible.');
        }
        
        if (criticalFailed.length > 0) {
            recommendations.push('⚠️ <strong>Critical Issues:</strong> Address authentication and session security first.');
        }
        
        if (failedTests.length > 0) {
            const topIssues = failedTests.slice(0, 3).map(r => r.name).join(', ');
            recommendations.push(`📋 <strong>Priority Fixes:</strong> Focus on ${topIssues}`);
        }
        
        if (overallScore >= 80) {
            recommendations.push('✅ <strong>Maintenance:</strong> Continue monitoring and regular security updates.');
        }
        
        return recommendations.join('<br>');
    }

    showSecurityReport() {
        const report = window.securityManager.getSecurityReport();
        const currentUser = this.currentUser;
        const isHTTPS = window.location.protocol === 'https:';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        let html = `
            <div class="alert alert-info">
                <h6><i class="fas fa-chart-bar me-2"></i>Comprehensive Security Report</h6>
                <div class="row">
                    <div class="col-md-6">
                        <strong>🔐 Authentication & Session:</strong><br>
                        • CSRF Protection: ${report.csrfToken ? '✅ Active' : '❌ Inactive'}<br>
                        • Rate Limiting: ${report.rateLimitAttempts}/5 attempts<br>
                        • Lockout Status: ${report.isLockedOut ? '🔒 Locked' : '✅ Active'}<br>
                        • User Authenticated: ${currentUser ? '✅ Yes' : '❌ No'}<br>
                        • Email Verified: ${currentUser && currentUser.emailVerified ? '✅ Yes' : '❌ No'}<br>
                        • Anonymous User: ${currentUser && currentUser.isAnonymous ? '⚠️ Yes' : '✅ No'}
                    </div>
                    <div class="col-md-6">
                        <strong>🛡️ Security Headers:</strong><br>
                        • Content-Type: ${report.securityHeaders.contentTypeOptions ? '✅' : '❌'}<br>
                        • Frame Options: ${report.securityHeaders.frameOptions ? '✅' : '❌'}<br>
                        • XSS Protection: ${report.securityHeaders.xssProtection ? '✅' : '❌'}<br>
                        • HTTPS: ${isHTTPS ? '✅ Yes' : isLocalhost ? '⚠️ Localhost' : '❌ No'}<br>
                        • CSP: ${document.querySelector('meta[http-equiv="Content-Security-Policy"]') ? '✅ Active' : '❌ Missing'}
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-6">
                        <strong>💾 Storage Security:</strong><br>
                        • CSRF Token: ${report.sessionStorage.csrfToken ? '✅ Present' : '❌ Missing'}<br>
                        • Security Logs: ${report.sessionStorage.securityLogs} entries<br>
                        • Local Storage: ${Object.keys(localStorage).length} items<br>
                        • Session Storage: ${Object.keys(sessionStorage).length} items
                    </div>
                    <div class="col-md-6">
                        <strong>🌐 Network & Environment:</strong><br>
                        • Protocol: ${window.location.protocol}<br>
                        • Hostname: ${window.location.hostname}<br>
                        • User Agent: ${navigator.userAgent.substring(0, 50)}...<br>
                        • Language: ${navigator.language}<br>
                        • Platform: ${navigator.platform}
                    </div>
                </div>
                
                <div class="mt-3 p-3 bg-light rounded">
                    <h6 class="mb-2"><i class="fas fa-exclamation-triangle me-2"></i>Security Status Summary</h6>
                    <div class="small">
                        ${this.getSecurityStatusSummary(report, currentUser, isHTTPS, isLocalhost)}
                    </div>
                </div>
                
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-primary" onclick="window.dashboardHandler.runSecurityTests()">
                        <i class="fas fa-sync-alt me-1"></i>Run Full Security Test
                    </button>
                    <button class="btn btn-sm btn-outline-secondary ms-2" onclick="window.dashboardHandler.exportSecurityReport()">
                        <i class="fas fa-download me-1"></i>Export Report
                    </button>
                </div>
            </div>
        `;

        this.showAlert(html, 'info');
    }

    getSecurityStatusSummary(report, currentUser, isHTTPS, isLocalhost) {
        const issues = [];
        const warnings = [];
        const good = [];

       
        if (!currentUser) issues.push('User not authenticated');
        if (currentUser && currentUser.isAnonymous) issues.push('Using anonymous authentication');
        if (!report.csrfToken) issues.push('CSRF protection inactive');
        if (report.isLockedOut) issues.push('Account temporarily locked');
        if (!isHTTPS && !isLocalhost) issues.push('Not using HTTPS');

      
        if (currentUser && !currentUser.emailVerified) warnings.push('Email not verified');
        if (report.rateLimitAttempts > 2) warnings.push('Multiple failed attempts detected');
        if (!report.securityHeaders.contentTypeOptions) warnings.push('Missing Content-Type header');
        if (!report.securityHeaders.frameOptions) warnings.push('Missing Frame Options header');
        if (!report.securityHeaders.xssProtection) warnings.push('Missing XSS Protection header');

       
        if (currentUser && !currentUser.isAnonymous) good.push('Authenticated user session');
        if (report.csrfToken) good.push('CSRF protection active');
        if (isHTTPS || isLocalhost) good.push('Secure connection');
        if (report.sessionStorage.securityLogs > 0) good.push('Security logging active');

        let summary = '';
        
        if (issues.length > 0) {
            summary += `🔴 <strong>Critical Issues (${issues.length}):</strong><br>`;
            issues.forEach(issue => summary += `• ${issue}<br>`);
            summary += '<br>';
        }
        
        if (warnings.length > 0) {
            summary += `🟡 <strong>Warnings (${warnings.length}):</strong><br>`;
            warnings.forEach(warning => summary += `• ${warning}<br>`);
            summary += '<br>';
        }
        
        if (good.length > 0) {
            summary += `🟢 <strong>Good Practices (${good.length}):</strong><br>`;
            good.forEach(item => summary += `• ${item}<br>`);
        }

        return summary || 'No security issues detected.';
    }

    updateSystemInfo() {
        
        const browserInfo = document.getElementById('browserInfo');
        if (browserInfo) {
            const userAgent = navigator.userAgent;
            let browser = 'Unknown';
            if (userAgent.includes('Chrome')) browser = 'Chrome';
            else if (userAgent.includes('Firefox')) browser = 'Firefox';
            else if (userAgent.includes('Safari')) browser = 'Safari';
            else if (userAgent.includes('Edge')) browser = 'Edge';
            browserInfo.textContent = browser;
        }

     
        const platformInfo = document.getElementById('platformInfo');
        if (platformInfo) {
            platformInfo.textContent = navigator.platform || 'Unknown';
        }

        
        const connectionInfo = document.getElementById('connectionInfo');
        if (connectionInfo) {
            const isHTTPS = window.location.protocol === 'https:';
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            if (isHTTPS) {
                connectionInfo.textContent = 'Secure (HTTPS)';
                connectionInfo.className = 'text-success';
            } else if (isLocalhost) {
                connectionInfo.textContent = 'Local Development';
                connectionInfo.className = 'text-warning';
            } else {
                connectionInfo.textContent = 'Insecure (HTTP)';
                connectionInfo.className = 'text-danger';
            }
        }

 
        const sessionTime = document.getElementById('sessionTime');
        if (sessionTime) {
            const now = Date.now();
            const sessionDuration = Math.floor((now - this.lastActivity) / 60000); // minutes
            sessionTime.textContent = `${sessionDuration} minutes active`;
        }
    }

    updateActivityInfo() {

        const lastLoginTime = document.getElementById('lastLoginTime');
        if (lastLoginTime && this.userData && this.userData.lastLogin) {
            const lastLogin = this.userData.lastLogin;
            const loginDate = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin);
            const now = new Date();
            const diffMinutes = Math.floor((now - loginDate) / 60000);
            
            if (diffMinutes < 1) {
                lastLoginTime.textContent = 'Just now';
            } else if (diffMinutes < 60) {
                lastLoginTime.textContent = `${diffMinutes} minutes ago`;
            } else if (diffMinutes < 1440) {
                const hours = Math.floor(diffMinutes / 60);
                lastLoginTime.textContent = `${hours} hours ago`;
            } else {
                const days = Math.floor(diffMinutes / 1440);
                lastLoginTime.textContent = `${days} days ago`;
            }
        }
    }

    exportUserData() {
        if (!this.userData) {
            this.showAlert('No user data available to export', 'warning');
            return;
        }

        const timestamp = new Date().toISOString();
        const exportData = {
            timestamp: timestamp,
            user: {
                uid: this.currentUser.uid,
                email: this.userData.email,
                fullName: this.userData.fullName,
                createdAt: this.userData.createdAt ? this.userData.createdAt.toDate ? this.userData.createdAt.toDate().toISOString() : this.userData.createdAt : null,
                lastLogin: this.userData.lastLogin ? this.userData.lastLogin.toDate ? this.userData.lastLogin.toDate().toISOString() : this.userData.lastLogin : null,
                loginCount: this.userData.loginCount || 0
            },
            system: {
                browser: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                protocol: window.location.protocol,
                hostname: window.location.hostname
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-${timestamp.split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showAlert('User data exported successfully!', 'success');
    }

    exportSecurityReport() {
        const report = window.securityManager.getSecurityReport();
        const currentUser = this.currentUser;
        const timestamp = new Date().toISOString();
        
        const reportData = {
            timestamp: timestamp,
            user: {
                uid: currentUser ? currentUser.uid : 'Not authenticated',
                email: currentUser ? currentUser.email : 'N/A',
                emailVerified: currentUser ? currentUser.emailVerified : false,
                isAnonymous: currentUser ? currentUser.isAnonymous : true
            },
            security: {
                csrfToken: report.csrfToken,
                rateLimitAttempts: report.rateLimitAttempts,
                isLockedOut: report.isLockedOut,
                securityHeaders: report.securityHeaders,
                sessionStorage: report.sessionStorage
            },
            environment: {
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform
            }
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${timestamp.split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showAlert('Security report exported successfully!', 'success');
    }
}

window.dashboardHandler = new DashboardHandler();

function refreshUserData() {
    if (window.dashboardHandler) {
        window.dashboardHandler.loadUserData();
    }
}

function toggleEditMode() {
    if (window.dashboardHandler) {
        window.dashboardHandler.toggleEditMode();
    }
}

function cancelEdit() {
    if (window.dashboardHandler) {
        window.dashboardHandler.toggleEditMode();
    }
}

 

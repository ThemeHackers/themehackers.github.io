class SecurityManager {
    constructor() {
        this.csrfToken = null;
        this.rateLimitAttempts = 0;
        this.maxAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000;
        this.lastAttempt = 0;
        
        this.init();
    }

    /**
     * Initialize security features
     */
    init() {
        this.generateCSRFToken();
        this.setupSecurityHeaders();
        this.setupInputValidation();
        this.setupPasswordValidation();
        this.setupRateLimiting();
    }

    /**
     * Generate CSRF token for form protection
     */
    generateCSRFToken() {
        this.csrfToken = this.generateRandomString(32);
        
        sessionStorage.setItem('csrf_token', this.csrfToken);
        
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = this.csrfToken;
            form.appendChild(csrfInput);
        });
    }

    /**
     * Generate cryptographically secure random string
     * @param {number} length - Length of the string
     * @returns {string} Random string
     */
    generateRandomString(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        
        for (let i = 0; i < length; i++) {
            result += charset[array[i] % charset.length];
        }
        return result;
    }

    /**
     * Setup security headers validation
     */
    setupSecurityHeaders() {
        
        const requiredHeaders = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection'
        ];

    }

    /**
     * Setup comprehensive input validation
     */
    setupInputValidation() {
       
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            if (input) {
                input.addEventListener('blur', () => this.validateEmail(input.value));
                input.addEventListener('input', () => this.sanitizeInput(input));
            }
        });

     
        const textInputs = document.querySelectorAll('input[type="text"]');
        textInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.sanitizeInput(input));
            }
        });

       
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.validatePasswordStrength(input.value));
            }
        });
    }

    /**
     * Setup password strength validation
     */
    setupPasswordValidation() {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            if (input) {
               
                const strengthIndicator = document.createElement('div');
                strengthIndicator.className = 'password-strength mt-2';
                strengthIndicator.id = `strength-${input.id}`;
                input.parentNode.appendChild(strengthIndicator);

                input.addEventListener('input', () => {
                    const strength = this.validatePasswordStrength(input.value);
                    this.updatePasswordStrengthIndicator(strengthIndicator, strength);
                });
            }
        });
    }

    /**
     * Setup rate limiting
     */
    setupRateLimiting() {
      
        const storedAttempts = sessionStorage.getItem('rate_limit_attempts');
        if (storedAttempts) {
            this.rateLimitAttempts = parseInt(storedAttempts);
        }

        const storedLastAttempt = sessionStorage.getItem('rate_limit_last_attempt');
        if (storedLastAttempt) {
            this.lastAttempt = parseInt(storedLastAttempt);
        }
    }

    /**
     * Validate email format and security
     * @param {string} email - Email to validate
     * @returns {boolean} Is email valid
     */
    validateEmail(email) {
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            this.showValidationError('Please enter a valid email address', 'warning');
            return false;
        }

       
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /data:text\/html/i
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(email)) {
                this.showValidationError('Email contains suspicious content', 'danger');
                return false;
            }
        }

        return true;
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {object} Password strength analysis
     */
    validatePasswordStrength(password) {
        const analysis = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            noCommon: !this.isCommonPassword(password),
            score: 0
        };

       
        if (analysis.length) analysis.score += 1;
        if (analysis.uppercase) analysis.score += 1;
        if (analysis.lowercase) analysis.score += 1;
        if (analysis.numbers) analysis.score += 1;
        if (analysis.special) analysis.score += 1;
        if (analysis.noCommon) analysis.score += 1;

        return analysis;
    }

    /**
     * Check if password is common/weak
     * @param {string} password - Password to check
     * @returns {boolean} Is common password
     */
    isCommonPassword(password) {
        const commonPasswords = [
            'password', '123456', 'qwerty', 'admin', 'letmein',
            'welcome', 'monkey', 'dragon', 'master', 'football',
            'baseball', 'superman', 'batman', 'spiderman', 'ironman'
        ];
        return commonPasswords.includes(password.toLowerCase());
    }

    /**
     * Update password strength indicator
     * @param {HTMLElement} indicator - Strength indicator element
     * @param {object} strength - Strength analysis
     */
    updatePasswordStrengthIndicator(indicator, strength) {
        let strengthText = '';
        let strengthClass = '';

        if (strength.score <= 2) {
            strengthText = 'Very Weak';
            strengthClass = 'text-danger';
        } else if (strength.score <= 3) {
            strengthText = 'Weak';
            strengthClass = 'text-warning';
        } else if (strength.score <= 4) {
            strengthText = 'Medium';
            strengthClass = 'text-info';
        } else if (strength.score <= 5) {
            strengthText = 'Strong';
            strengthClass = 'text-success';
        } else {
            strengthText = 'Very Strong';
            strengthClass = 'text-success';
        }

        indicator.innerHTML = `
            <small class="${strengthClass}">
                <i class="fas fa-shield-alt me-1"></i>
                Password Strength: ${strengthText}
            </small>
        `;
    }

    /**
     * Sanitize input to prevent XSS
     * @param {HTMLElement|string} input - Input element or string to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeInput(input) {

        const DOMPurify = window.DOMPurify;
        if (!DOMPurify) return input;
        if (typeof input === 'string') {
            return DOMPurify.sanitize(input);
        } else if (input && input.value) {
            input.value = DOMPurify.sanitize(input.value);
            return input.value;
        }
        return input;
    }

    /**
     * Check rate limiting
     * @returns {boolean} Is rate limit exceeded
     */
    checkRateLimit() {
        const now = Date.now();
        
        
        if (this.rateLimitAttempts >= this.maxAttempts) {
            const timeSinceLastAttempt = now - this.lastAttempt;
            if (timeSinceLastAttempt < this.lockoutTime) {
                const remainingMinutes = Math.ceil((this.lockoutTime - timeSinceLastAttempt) / 60000);
                this.showValidationError(`Too many attempts. Please try again in ${remainingMinutes} minutes.`, 'danger');
                return false;
            } else {
                
                this.rateLimitAttempts = 0;
                sessionStorage.removeItem('rate_limit_attempts');
            }
        }
        
        this.lastAttempt = now;
        sessionStorage.setItem('rate_limit_last_attempt', now.toString());
        return true;
    }

    /**
     * Increment rate limit attempts
     */
    incrementRateLimit() {
        this.rateLimitAttempts++;
        sessionStorage.setItem('rate_limit_attempts', this.rateLimitAttempts.toString());
    }

    /**
     * Reset rate limit on successful action
     */
    resetRateLimit() {
        this.rateLimitAttempts = 0;
        sessionStorage.removeItem('rate_limit_attempts');
        sessionStorage.removeItem('rate_limit_last_attempt');
    }

    /**
     * Validate CSRF token
     * @param {string} token - Token to validate
     * @returns {boolean} Is token valid
     */
    validateCSRFToken(token) {
        const storedToken = sessionStorage.getItem('csrf_token');
        return token === storedToken;
    }

    /**
     * Show validation error
     * @param {string} message - Error message
     * @param {string} type - Alert type
     */
    showValidationError(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
            alertDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            alertContainer.appendChild(alertDiv);

           
            setTimeout(() => {
                if (alertDiv && alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }

    /**
     * Log security event
     * @param {string} event - Event type
     * @param {object} data - Event data
     */
    logSecurityEvent(event, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...data
        };

        console.log('🔒 Security Event:', logEntry);
        
       
        const securityLogs = JSON.parse(sessionStorage.getItem('security_logs') || '[]');
        securityLogs.push(logEntry);
        sessionStorage.setItem('security_logs', JSON.stringify(securityLogs.slice(-10)));
    }

    /**
     * Get security report
     * @returns {object} Security status report
     */
    getSecurityReport() {
        return {
            csrfToken: !!this.csrfToken,
            rateLimitAttempts: this.rateLimitAttempts,
            isLockedOut: this.rateLimitAttempts >= this.maxAttempts,
            securityHeaders: {
                contentTypeOptions: !!document.querySelector('meta[http-equiv="X-Content-Type-Options"]'),
                frameOptions: !!document.querySelector('meta[http-equiv="X-Frame-Options"]'),
                xssProtection: !!document.querySelector('meta[http-equiv="X-XSS-Protection"]')
            },
            sessionStorage: {
                csrfToken: !!sessionStorage.getItem('csrf_token'),
                rateLimitAttempts: sessionStorage.getItem('rate_limit_attempts'),
                securityLogs: JSON.parse(sessionStorage.getItem('security_logs') || '[]').length
            }
        };
    }
}


window.securityManager = new SecurityManager();


if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityManager;
} 

/**
 * ThemeHackers Matrix Effect
 * Creates a Matrix-style falling characters effect
 */

class MatrixEffect {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.chars = options.chars || '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        this.opacity = options.opacity || 0.1;
        this.interval = options.interval || 100;
        this.duration = options.duration || 4000;
        this.fontSize = options.fontSize || '1rem';
        this.isActive = false;
        this.matrixBg = null;
        this.intervalId = null;
    }

    /**
     * Initialize the matrix effect
     */
    init() {
        if (this.isActive) return;

   
        this.matrixBg = document.createElement('div');
        this.matrixBg.className = 'matrix-bg';
        this.matrixBg.style.opacity = this.opacity;
        this.container.appendChild(this.matrixBg);

        this.isActive = true;
        this.start();
    }

    /**
     * Start the matrix effect
     */
    start() {
        if (this.intervalId) return;

        this.intervalId = setInterval(() => {
            this.createMatrixChar();
        }, this.interval);
    }

    /**
     * Stop the matrix effect
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Destroy the matrix effect
     */
    destroy() {
        this.stop();
        if (this.matrixBg && this.matrixBg.parentNode) {
            this.matrixBg.parentNode.removeChild(this.matrixBg);
        }
        this.isActive = false;
    }

    /**
     * Create a single matrix character
     */
    createMatrixChar() {
        if (!this.matrixBg) return;

        const char = document.createElement('div');
        char.className = 'matrix-char';
        char.textContent = this.chars[Math.floor(Math.random() * this.chars.length)];
        char.style.left = Math.random() * 100 + '%';
        char.style.fontSize = this.fontSize;
        char.style.animationDuration = (Math.random() * 2 + 2) + 's';
        
        this.matrixBg.appendChild(char);
        
        
        setTimeout(() => {
            if (char && char.parentNode) {
                char.remove();
            }
        }, this.duration);
    }

    /**
     * Update effect options
     */
    updateOptions(options) {
        if (options.opacity !== undefined) {
            this.opacity = options.opacity;
            if (this.matrixBg) {
                this.matrixBg.style.opacity = this.opacity;
            }
        }
        
        if (options.interval !== undefined) {
            this.interval = options.interval;
            if (this.isActive) {
                this.stop();
                this.start();
            }
        }
        
        if (options.fontSize !== undefined) {
            this.fontSize = options.fontSize;
        }
    }
}

/**
 * ThemeHackers Security Animations
 */
class ThemeHackersAnimations {
    constructor() {
        this.matrixEffect = null;
        this.init();
    }

    /**
     * Initialize animations
     */
    init() {
       
        this.matrixEffect = new MatrixEffect({
            opacity: 0.1,
            interval: 100,
            duration: 4000,
            fontSize: '1rem'
        });
        this.matrixEffect.init();

        
        this.addSecurityAnimations();
    }

    /**
     * Add security-themed animations
     */
    addSecurityAnimations() {
        
        const securityIcons = document.querySelectorAll('.fas.fa-shield-alt, .fas.fa-lock, .fas.fa-user-shield');
        securityIcons.forEach(icon => {
            icon.style.animation = 'pulse 2s infinite';
        });

        
        const primaryButtons = document.querySelectorAll('.btn-primary, .th-btn-primary');
        primaryButtons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.5)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.boxShadow = '';
            });
        });
    }

    /**
     * Create loading animation
     */
    createLoadingAnimation(element, text = 'Loading...') {
        const originalContent = element.innerHTML;
        const loadingContent = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            ${text}
        `;
        
        element.innerHTML = loadingContent;
        element.disabled = true;
        
        return () => {
            element.innerHTML = originalContent;
            element.disabled = false;
        };
    }

    /**
     * Create security scan animation
     */
    createSecurityScan() {
        const scanElement = document.createElement('div');
        scanElement.className = 'security-scan';
        scanElement.innerHTML = `
            <div class="scan-line"></div>
            <div class="scan-text">SECURITY SCAN IN PROGRESS...</div>
        `;
        
        document.body.appendChild(scanElement);
        
        setTimeout(() => {
            if (scanElement.parentNode) {
                scanElement.remove();
            }
        }, 3000);
    }
}

/**
 * ThemeHackers Security Utilities
 */
class ThemeHackersUtils {
    /**
     * Show security alert
     */
    static showSecurityAlert(message, type = 'info', duration = 5000) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show th-alert th-alert-${type}`;
        alertDiv.innerHTML = `
            <i class="fas fa-shield-alt me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        alertContainer.appendChild(alertDiv);


        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, duration);
    }

    /**
     * Validate password strength
     */
    static validatePasswordStrength(password) {
        let strength = 0;
        let feedback = [];

        if (password.length >= 8) strength++;
        else feedback.push('At least 8 characters');

        if (/[a-z]/.test(password)) strength++;
        else feedback.push('Include lowercase letters');

        if (/[A-Z]/.test(password)) strength++;
        else feedback.push('Include uppercase letters');

        if (/[0-9]/.test(password)) strength++;
        else feedback.push('Include numbers');

        if (/[^A-Za-z0-9]/.test(password)) strength++;
        else feedback.push('Include special characters');

        let strengthText = '';
        let strengthClass = '';

        if (strength <= 2) {
            strengthText = 'Weak';
            strengthClass = 'strength-weak';
        } else if (strength <= 4) {
            strengthText = 'Medium';
            strengthClass = 'strength-medium';
        } else {
            strengthText = 'Strong';
            strengthClass = 'strength-strong';
        }

        return {
            strength,
            strengthText,
            strengthClass,
            feedback
        };
    }

    /**
     * Format date for ThemeHackers style
     */
    static formatSecurityDate(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Generate security token
     */
    static generateSecurityToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Sanitize input for security
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        let sanitizedInput = input.trim();
        let previousInput;
        
        do {
            previousInput = sanitizedInput;
            sanitizedInput = sanitizedInput
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/[<>]/g, '');  // Remove leftover < and >
        } while (sanitizedInput !== previousInput);
        
        return sanitizedInput;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.themeHackersAnimations = new ThemeHackersAnimations();
    window.themeHackersUtils = ThemeHackersUtils;
});


if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MatrixEffect,
        ThemeHackersAnimations,
        ThemeHackersUtils
    };
} 
/**
 * Health Check Utility
 * 
 * This script provides health check functionality to verify
 * environment variables and Firebase configuration status.
 * 
 * @author ThemeHackers Security Team
 * @version 1.0.0
 */

class HealthChecker {
    constructor() {
        this.healthStatus = {
            firebase: 'unknown',
            environment: 'unknown',
            functions: 'unknown',
            lastCheck: null
        };
    }

    async performHealthCheck() {
        
        try {
            const currentDomain = window.location.origin;
            const healthUrl = `${currentDomain}/.netlify/functions/health-check`;
            
            
            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const healthData = await response.json();
            
            this.healthStatus = {
                firebase: healthData.services?.firebase?.status || 'unknown',
                environment: healthData.environment || 'unknown',
                functions: healthData.status || 'unknown',
                lastCheck: new Date().toISOString(),
                details: healthData
            };
                
            if (healthData.status === 'unhealthy') {
                this.showHealthWarning(healthData);
            }

            return this.healthStatus;

        } catch (error) {
            console.error('❌ Health check failed:', error);
            
            this.healthStatus = {
                firebase: 'error',
                environment: 'error',
                functions: 'error',
                lastCheck: new Date().toISOString(),
                error: error.message
            };

            this.showHealthWarning({
                status: 'error',
                message: 'Health check failed',
                error: error.message
            });

            return this.healthStatus;
        }
    }

    /**
     * Check Firebase configuration specifically
     */
    async checkFirebaseConfig() {
        try {
            const currentDomain = window.location.origin;
            const configUrl = `${currentDomain}/.netlify/functions/firebase-config`;
            
            const response = await fetch(configUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const configData = await response.json();
            
            if (!configData.success) {
                throw new Error('Firebase configuration failed');
            }

            return {
                status: 'healthy',
                config: configData.config
            };

        } catch (error) {
            console.error('❌ Firebase config check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    showHealthWarning(healthData) {
        const warningMessage = this.formatHealthWarning(healthData);
        
        if (window.showAlert) {
            window.showAlert(warningMessage, 'warning');
        } else {
            console.warn('⚠️ Health Warning:', warningMessage);
        }
    }

    formatHealthWarning(healthData) {
        let message = 'ThemeHackers Security: System health check detected issues.';
        
        if (healthData.services?.firebase?.status === 'misconfigured') {
            message += ' Firebase configuration is incomplete.';
        }
        
        if (healthData.recommendations && healthData.recommendations.length > 0) {
            message += ' ' + healthData.recommendations.join(' ');
        }
        
        return message;
    }
    getHealthStatus() {
        return this.healthStatus;
    }
    isHealthy() {
        return this.healthStatus.functions === 'healthy' && 
               this.healthStatus.firebase === 'configured';
    }

    getDetailedReport() {
        return {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            health: this.healthStatus,
            firebase: window.firebaseConfigLoader ? {
                config: window.firebaseConfigLoader.config,
                isReady: window.firebaseConfigLoader.isFirebaseReady()
            } : null
        };
    }
}

window.healthChecker = new HealthChecker();


document.addEventListener('DOMContentLoaded', async function() {
   
    setTimeout(async () => {
        try {
            await window.healthChecker.performHealthCheck();
        } catch (error) {
            console.error('❌ Auto health check failed:', error);
        }
    }, 2000);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HealthChecker;
} 

class FirebaseConfigLoader {
    constructor() {
        this.config = null;
        this.isLoading = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 2000;
    }

    async loadFirebaseConfig() {
        if (this.isLoading) {
            return;
        }
        this.isLoading = true;
        try {
            const envConfig = this.getConfigFromEnvironment();
            if (envConfig && envConfig.apiKey) {
                this.config = envConfig;
                await this.initializeFirebase();
                return this.config;
            }
            const metaConfig = this.getConfigFromMetaTags();
            if (metaConfig && metaConfig.apiKey) {
                this.config = metaConfig;
                await this.initializeFirebase();
                return this.config;
            }
            const windowConfig = this.getConfigFromWindow();
            if (windowConfig && windowConfig.apiKey) {
                this.config = windowConfig;
                await this.initializeFirebase();
                return this.config;
            }
            await this.loadFromNetlifyFunction();
        } catch (error) {
            console.error('❌ Error loading Firebase configuration:', error);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(() => {
                    this.isLoading = false;
                    this.loadFirebaseConfig();
                }, this.retryDelay * this.retryCount);
                return;
            }
            this.config = this.getFallbackConfig();
            this.showConfigurationError();
            await this.initializeFirebase();
        } finally {
            this.isLoading = false;
        }
    }
    getConfigFromEnvironment() {
        try {
            const env = window.ENV || window.process?.env || {};
            const config = {
                apiKey: env.FIREBASE_API_KEY || env.REACT_APP_FIREBASE_API_KEY,
                authDomain: env.FIREBASE_AUTH_DOMAIN || env.REACT_APP_FIREBASE_AUTH_DOMAIN,
                projectId: env.FIREBASE_PROJECT_ID || env.REACT_APP_FIREBASE_PROJECT_ID,
                storageBucket: env.FIREBASE_STORAGE_BUCKET || env.REACT_APP_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
                appId: env.FIREBASE_APP_ID || env.REACT_APP_FIREBASE_APP_ID,
                measurementId: env.FIREBASE_MEASUREMENT_ID || env.REACT_APP_FIREBASE_MEASUREMENT_ID
            };
            if (config.apiKey && config.projectId) {
                return config;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    getConfigFromMetaTags() {
        try {
            const metaTags = {
                apiKey: document.querySelector('meta[name="firebase-api-key"]')?.getAttribute('content'),
                authDomain: document.querySelector('meta[name="firebase-auth-domain"]')?.getAttribute('content'),
                projectId: document.querySelector('meta[name="firebase-project-id"]')?.getAttribute('content'),
                storageBucket: document.querySelector('meta[name="firebase-storage-bucket"]')?.getAttribute('content'),
                messagingSenderId: document.querySelector('meta[name="firebase-messaging-sender-id"]')?.getAttribute('content'),
                appId: document.querySelector('meta[name="firebase-app-id"]')?.getAttribute('content'),
                measurementId: document.querySelector('meta[name="firebase-measurement-id"]')?.getAttribute('content')
            };
            if (metaTags.apiKey && metaTags.projectId) {
                return metaTags;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    getConfigFromWindow() {
        try {
            const windowConfig = window.FIREBASE_CONFIG || window.firebaseConfig || {};
            if (windowConfig.apiKey && windowConfig.projectId) {
                return windowConfig;
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    async loadFromNetlifyFunction() {
        try {
            const currentDomain = window.location.origin;
            const functionUrl = `${currentDomain}/.netlify/functions/firebase-config`;
            const response = await fetch(functionUrl, {
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
            const data = await response.json();
            if (!data.success || !data.config) {
                throw new Error('Invalid configuration response from function');
            }
            this.config = data.config;
            await this.initializeFirebase();
        } catch (error) {
           
            console.error('❌ Error loading from Netlify Function:', error);
            throw error;
        }
    }
    async initializeFirebase() {
        try {
            if (!this.config) {
                throw new Error('No Firebase configuration available');
            }
            if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {

                window.auth = window.firebase.auth();
                window.db = window.firebase.firestore();
                return;
            }
            if (window.firebase) {
                window.firebase.initializeApp(this.config);
                window.auth = window.firebase.auth();
                window.db = window.firebase.firestore();
                window.dispatchEvent(new CustomEvent('firebaseReady', {
                    detail: { auth: window.auth, db: window.db }
                }));
            } else {
                throw new Error('Firebase SDK not loaded');
            }
        } catch (error) {
         
            console.error('\u274c Error initializing Firebase:', error);
            throw error;
        }
    }
    getFallbackConfig() {
        return {
            apiKey: "", 
            authDomain: "",
            projectId: "",
            storageBucket: "",
            messagingSenderId: "",
            appId: "",
            measurementId: ""
        };
    }
    isFirebaseReady() {
        return !!(window.auth && window.db);
    }
    async waitForFirebase(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkFirebase = () => {
                if (this.isFirebaseReady()) {
                    resolve({ auth: window.auth, db: window.db });
                    return;
                }
                if (Date.now() - startTime > timeout) {
                    reject(new Error('Firebase initialization timeout'));
                    return;
                }
                setTimeout(checkFirebase, 100);
            };
            checkFirebase();
        });
    }
    showConfigurationError() {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-warning';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Configuration Issue:</strong> Firebase configuration not found. 
            <br><small>This may affect authentication functionality. Please contact support if this persists.</small>
        `;
        alertContainer.appendChild(errorDiv);
    }
}
window.firebaseConfigLoader = new FirebaseConfigLoader();
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await window.firebaseConfigLoader.loadFirebaseConfig();
    } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error);
        const errorMessage = 'ThemeHackers Security: Unable to initialize security services. Please refresh the page or contact support.';
        if (window.showAlert) {
            window.showAlert(errorMessage, 'danger');
        } else {
            console.error(errorMessage);
        }
    }
});
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseConfigLoader;
} 

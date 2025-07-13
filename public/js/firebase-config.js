/**
 * Firebase Configuration Loader
 * 
 * This script loads Firebase configuration directly from Netlify environment variables
 * using Netlify's built-in environment variable injection.
 * 
 * @author ThemeHackers Security Team
 * @version 2.0.0
 */

class FirebaseConfigLoader {
    constructor() {
        this.config = null;
        this.isLoading = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 2000;
    }

    /**
     * Load Firebase configuration from Netlify environment variables
     */
    async loadFirebaseConfig() {
        if (this.isLoading) {
            console.log('🔄 Firebase config loading in progress...');
            return;
        }

        this.isLoading = true;
        console.log('🚀 Loading Firebase configuration from environment variables...');

        try {
            // Method 1: Try to get from Netlify's environment variable injection
            const envConfig = this.getConfigFromEnvironment();
            
            if (envConfig && envConfig.apiKey) {
                console.log('✅ Found Firebase config in environment variables');
                this.config = envConfig;
                await this.initializeFirebase();
                return this.config;
            }

            // Method 2: Try to get from meta tags (if injected by Netlify)
            const metaConfig = this.getConfigFromMetaTags();
            
            if (metaConfig && metaConfig.apiKey) {
                console.log('✅ Found Firebase config in meta tags');
                this.config = metaConfig;
                await this.initializeFirebase();
                return this.config;
            }

            // Method 3: Try to get from window object (if injected by Netlify)
            const windowConfig = this.getConfigFromWindow();
            
            if (windowConfig && windowConfig.apiKey) {
                console.log('✅ Found Firebase config in window object');
                this.config = windowConfig;
                await this.initializeFirebase();
                return this.config;
            }

            // Method 4: Fallback to Netlify Function
            console.log('📡 Falling back to Netlify Function...');
            await this.loadFromNetlifyFunction();

        } catch (error) {
            console.error('❌ Error loading Firebase configuration:', error);
            
            // Retry logic
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Retrying... (${this.retryCount}/${this.maxRetries})`);
                
                setTimeout(() => {
                    this.isLoading = false;
                    this.loadFirebaseConfig();
                }, this.retryDelay * this.retryCount);
                
                return;
            }

            // Final fallback to default config for development
            console.warn('⚠️ Using fallback configuration for development');
            this.config = this.getFallbackConfig();
            await this.initializeFirebase();
            
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Try to get config from environment variables (Netlify injection)
     */
    getConfigFromEnvironment() {
        try {
            // Netlify sometimes injects environment variables into the page
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

            // Check if we have the minimum required fields
            if (config.apiKey && config.projectId) {
                console.log('✅ Environment variables found:', Object.keys(config).filter(key => config[key]));
                return config;
            }

            return null;
        } catch (error) {
            console.warn('⚠️ Could not read from environment variables:', error);
            return null;
        }
    }

    /**
     * Try to get config from meta tags (if Netlify injects them)
     */
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

            // Check if we have the minimum required fields
            if (metaTags.apiKey && metaTags.projectId) {
                console.log('✅ Meta tags found:', Object.keys(metaTags).filter(key => metaTags[key]));
                return metaTags;
            }

            return null;
        } catch (error) {
            console.warn('⚠️ Could not read from meta tags:', error);
            return null;
        }
    }

    /**
     * Try to get config from window object (if Netlify injects them)
     */
    getConfigFromWindow() {
        try {
            const windowConfig = window.FIREBASE_CONFIG || window.firebaseConfig || {};
            
            if (windowConfig.apiKey && windowConfig.projectId) {
                console.log('✅ Window config found:', Object.keys(windowConfig).filter(key => windowConfig[key]));
                return windowConfig;
            }

            return null;
        } catch (error) {
            console.warn('⚠️ Could not read from window object:', error);
            return null;
        }
    }

    /**
     * Load config from Netlify Function (fallback method)
     */
    async loadFromNetlifyFunction() {
        try {
            const currentDomain = window.location.origin;
            const functionUrl = `${currentDomain}/.netlify/functions/firebase-config`;
            
            console.log('📡 Fetching config from Netlify Function:', functionUrl);

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
            console.log('✅ Firebase configuration loaded from Netlify Function');
            
            await this.initializeFirebase();
            
        } catch (error) {
            console.error('❌ Error loading from Netlify Function:', error);
            throw error;
        }
    }

    /**
     * Initialize Firebase with the loaded configuration
     */
    async initializeFirebase() {
        try {
            if (!this.config) {
                throw new Error('No Firebase configuration available');
            }

            // Check if Firebase is already initialized
            if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
                console.log('✅ Firebase already initialized');
                return;
            }

            // Initialize Firebase
            if (window.firebase) {
                window.firebase.initializeApp(this.config);
                
                // Initialize Auth and Firestore
                window.auth = window.firebase.auth();
                window.db = window.firebase.firestore();
                
                console.log('✅ Firebase initialized successfully');
                
                // Dispatch custom event to notify other scripts
                window.dispatchEvent(new CustomEvent('firebaseReady', {
                    detail: { auth: window.auth, db: window.db }
                }));
                
            } else {
                throw new Error('Firebase SDK not loaded');
            }

        } catch (error) {
            console.error('❌ Error initializing Firebase:', error);
            throw error;
        }
    }

    /**
     * Get fallback configuration for development
     */
    getFallbackConfig() {
        // This should only be used for development/testing
        // In production, environment variables should provide the real config
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

    /**
     * Check if Firebase is ready
     */
    isFirebaseReady() {
        return !!(window.auth && window.db);
    }

    /**
     * Wait for Firebase to be ready
     */
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

    /**
     * Debug: Log all available environment variables
     */
    debugEnvironmentVariables() {
        console.log('🔍 Debugging environment variables...');
        
        // Check window.ENV
        if (window.ENV) {
            console.log('Window.ENV:', window.ENV);
        }
        
        // Check window.process.env
        if (window.process?.env) {
            console.log('Window.process.env:', window.process.env);
        }
        
        // Check meta tags
        const metaTags = document.querySelectorAll('meta[name*="firebase"]');
        console.log('Firebase meta tags:', Array.from(metaTags).map(tag => ({
            name: tag.getAttribute('name'),
            content: tag.getAttribute('content')
        })));
        
        // Check window config
        if (window.FIREBASE_CONFIG) {
            console.log('Window.FIREBASE_CONFIG:', window.FIREBASE_CONFIG);
        }
        
        if (window.firebaseConfig) {
            console.log('Window.firebaseConfig:', window.firebaseConfig);
        }
    }
}

// Create global instance
window.firebaseConfigLoader = new FirebaseConfigLoader();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🌐 Starting Firebase configuration...');
        
        // Debug environment variables in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.firebaseConfigLoader.debugEnvironmentVariables();
        }
        
        await window.firebaseConfigLoader.loadFirebaseConfig();
    } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error);
        
        // Show user-friendly error message
        const errorMessage = 'ThemeHackers Security: Unable to initialize security services. Please refresh the page or contact support.';
        
        // Try to show alert if available
        if (window.showAlert) {
            window.showAlert(errorMessage, 'danger');
        } else {
            console.error(errorMessage);
        }
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseConfigLoader;
} 
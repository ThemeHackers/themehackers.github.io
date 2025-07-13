class EnvironmentConfig {
    constructor() {
        this.config = null;
        this.isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1';
    }

    
    
    getEnvironmentVariables() {
        const env = {};
        
        
        if (window.ENV) {
            Object.assign(env, window.ENV);
        }
      
        if (window.process?.env) {
            Object.assign(env, window.process.env);
        }
     
        const metaTags = document.querySelectorAll('meta[name*="firebase"]');
        metaTags.forEach(tag => {
            const name = tag.getAttribute('name');
            const content = tag.getAttribute('content');
            if (name && content) {
                env[name] = content;
            }
        });
        
        return env;
    }


    hasFirebaseConfig() {
        const env = this.getEnvironmentVariables();
        const requiredVars = [
            'FIREBASE_API_KEY',
            'FIREBASE_AUTH_DOMAIN', 
            'FIREBASE_PROJECT_ID',
            'FIREBASE_STORAGE_BUCKET',
            'FIREBASE_MESSAGING_SENDER_ID',
            'FIREBASE_APP_ID',
            'FIREBASE_MEASUREMENT_ID'
        ];
        
        return requiredVars.every(varName => env[varName]);
    }

    getFirebaseConfig() {
        const env = this.getEnvironmentVariables();
        
        return {
            apiKey: env.FIREBASE_API_KEY || env.REACT_APP_FIREBASE_API_KEY,
            authDomain: env.FIREBASE_AUTH_DOMAIN || env.REACT_APP_FIREBASE_AUTH_DOMAIN,
            projectId: env.FIREBASE_PROJECT_ID || env.REACT_APP_FIREBASE_PROJECT_ID,
            storageBucket: env.FIREBASE_STORAGE_BUCKET || env.REACT_APP_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
            appId: env.FIREBASE_APP_ID || env.REACT_APP_FIREBASE_APP_ID,
            measurementId: env.FIREBASE_MEASUREMENT_ID || env.REACT_APP_FIREBASE_MEASUREMENT_ID
        };
    }

    debugEnvironment() {
        console.log('🔍 Environment Configuration Debug:');
        console.log('Is Production:', this.isProduction);
        console.log('Hostname:', window.location.hostname);
        console.log('Environment Variables:', this.getEnvironmentVariables());
        console.log('Has Firebase Config:', this.hasFirebaseConfig());
        
        if (this.hasFirebaseConfig()) {
            console.log('Firebase Config:', this.getFirebaseConfig());
        } else {
            console.warn('⚠️ Firebase configuration not found in environment variables');
        }
    }


    showConfigStatus() {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;
        
        if (this.hasFirebaseConfig()) {
            const successDiv = document.createElement('div');
            successDiv.className = 'alert alert-success';
            successDiv.innerHTML = `
                <i class="fas fa-check-circle me-2"></i>
                <strong>Configuration OK:</strong> Firebase is properly configured.
            `;
            alertContainer.appendChild(successDiv);
        } else if (this.isProduction) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'alert alert-warning';
            warningDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Configuration Warning:</strong> Firebase environment variables not found. 
                This may affect functionality.
            `;
            alertContainer.appendChild(warningDiv);
        }
    }
}


window.envConfig = new EnvironmentConfig();


if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.envConfig.debugEnvironment();
}


document.addEventListener('DOMContentLoaded', function() {
    window.envConfig.showConfigStatus();
});


if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentConfig;
} 

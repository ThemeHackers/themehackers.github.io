const SecurityMiddleware = require('./security-middleware');
const security = new SecurityMiddleware();

exports.handler = security.middleware(async (event, context) => {
    try {

        security.logSecurityEvent('firebase_config_request', {
            method: event.httpMethod,
            path: event.path,
            userAgent: event.headers['user-agent'],
            origin: event.headers.origin,
            referer: event.headers.referer,
            clientIP: security.getClientIP(event)
        });

      
        if (event.httpMethod !== 'GET') {
            security.logSecurityEvent('firebase_config_method_blocked', {
                method: event.httpMethod,
                clientIP: security.getClientIP(event)
            });
            return {
                statusCode: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block'
                },
                body: JSON.stringify({
                    error: true,
                    message: 'Method not allowed'
                })
            };
        }

       
        const allowedOrigins = [
            'https://themehackers.github.io',
            'https://dashsecurity.netlify.app',
            'https://dashsecurity-database.firebaseapp.com',
            'https://dashsecurity-database.web.app',
            'https://kpltgroup.com',
            'https://www.cstg.kpltgroup.com',
            'http://localhost',
            'http://127.0.0.1',
            'http://localhost:3000',
            'http://localhost:8888'
        ];
        
        const requestOrigin = event.headers.origin || event.headers.referer;
        const isAllowedOrigin = allowedOrigins.some(origin => 
            requestOrigin && requestOrigin.includes(origin)
        );

        if (!isAllowedOrigin && process.env.NODE_ENV === 'production') {
            security.logSecurityEvent('firebase_config_origin_blocked', {
                origin: requestOrigin,
                clientIP: security.getClientIP(event)
            });
            return {
                statusCode: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block'
                },
                body: JSON.stringify({
                    error: true,
                    message: 'Access denied'
                })
            };
        }


        const rateLimitCheck = security.checkRateLimit(event);
        if (!rateLimitCheck.success) {
            security.logSecurityEvent('firebase_config_rate_limited', {
                clientIP: security.getClientIP(event),
                message: rateLimitCheck.message
            });
            return {
                statusCode: rateLimitCheck.statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block'
                },
                body: JSON.stringify({
                    error: true,
                    message: rateLimitCheck.message
                })
            };
        }


        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID,
            measurementId: process.env.FIREBASE_MEASUREMENT_ID
        };


        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            security.logSecurityEvent('firebase_config_incomplete', {
                clientIP: security.getClientIP(event)
            });
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block'
                },
                body: JSON.stringify({
                    error: true,
                    message: 'Firebase configuration incomplete'
                })
            };
        }


        security.logSecurityEvent('firebase_config_success', {
            clientIP: security.getClientIP(event),
            origin: requestOrigin
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            body: JSON.stringify({
                success: true,
                config: firebaseConfig
            })
        };

    } catch (error) {
        console.error('Firebase config function error:', error);
        security.logSecurityEvent('firebase_config_error', {
            error: error.message,
            clientIP: security.getClientIP(event)
        });
        return security.createSecurityResponse(500, 'Internal server error');
    }
}); 
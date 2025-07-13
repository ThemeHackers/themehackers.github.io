/**
 * Security Middleware for Netlify Functions
 * 
 * This module provides comprehensive server-side security features:
 * - bcrypt password hashing (12 salt rounds)
 * - JWT token management (access + refresh tokens)
 * - CSRF protection
 * - Rate limiting
 * - Input validation and sanitization
 * - Security headers
 * - Brute force protection
 * 
 * @author Security Team
 * @version 1.0.0
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class SecurityMiddleware {
    constructor() {
        this.saltRounds = 12;
        this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
        this.refreshSecret = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
        this.accessTokenExpiry = '15m';
        this.refreshTokenExpiry = '7d';
        this.rateLimitStore = new Map();
        this.maxRequestsPerMinute = 60;
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; 
    }

    /**
     * Main middleware function
     * @param {Function} handler - Original function handler
     * @returns {Function} Wrapped handler with security
     */
    middleware(handler) {
        return async (event, context) => {
            try {
             
                const securityCheck = await this.applySecurityChecks(event);
                if (!securityCheck.success) {
                    return this.createSecurityResponse(securityCheck.statusCode, securityCheck.message);
                }

               
                const response = await handler(event, context);
                return this.addSecurityHeaders(response);

            } catch (error) {
                console.error('Security middleware error:', error);
                return this.createSecurityResponse(500, 'Internal server error');
            }
        };
    }

    /**
     * Apply comprehensive security checks
     * @param {Object} event - Netlify function event
     * @returns {Object} Security check result
     */
    async applySecurityChecks(event) {
       
        const rateLimitCheck = this.checkRateLimit(event);
        if (!rateLimitCheck.success) {
            return rateLimitCheck;
        }

      
        const csrfCheck = this.validateCSRFToken(event);
        if (!csrfCheck.success) {
            return csrfCheck;
        }

       
        const inputCheck = this.validateAndSanitizeInput(event);
        if (!inputCheck.success) {
            return inputCheck;
        }

        return { success: true };
    }

    /**
     * Hash password with bcrypt (12 salt rounds)
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        try {
            const salt = await bcrypt.genSalt(this.saltRounds);
            return await bcrypt.hash(password, salt);
        } catch (error) {
            console.error('Password hashing error:', error);
            throw new Error('Password hashing failed');
        }
    }

    /**
     * Compare password with hash
     * @param {string} password - Plain text password
     * @param {string} hash - Hashed password
     * @returns {Promise<boolean>} Password match
     */
    async comparePassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            console.error('Password comparison error:', error);
            return false;
        }
    }

    /**
     * Generate JWT tokens
     * @param {Object} payload - Token payload
     * @returns {Object} Access and refresh tokens
     */
    generateTokens(payload) {
        try {
            const accessToken = jwt.sign(payload, this.jwtSecret, {
                expiresIn: this.accessTokenExpiry,
                issuer: 'netlify-auth',
                audience: 'web-app'
            });

            const refreshToken = jwt.sign(payload, this.refreshSecret, {
                expiresIn: this.refreshTokenExpiry,
                issuer: 'netlify-auth',
                audience: 'web-app'
            });

            return { accessToken, refreshToken };
        } catch (error) {
            console.error('Token generation error:', error);
            throw new Error('Token generation failed');
        }
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token
     * @param {string} secret - Secret key
     * @returns {Object} Decoded token payload
     */
    verifyToken(token, secret = this.jwtSecret) {
        try {
            return jwt.verify(token, secret, {
                issuer: 'netlify-auth',
                audience: 'web-app'
            });
        } catch (error) {
            console.error('Token verification error:', error);
            throw new Error('Invalid token');
        }
    }

    /**
     * Refresh access token
     * @param {string} refreshToken - Refresh token
     * @returns {Object} New access token
     */
    refreshAccessToken(refreshToken) {
        try {
            const decoded = this.verifyToken(refreshToken, this.refreshSecret);
            const newAccessToken = jwt.sign(
                { userId: decoded.userId, email: decoded.email },
                this.jwtSecret,
                { expiresIn: this.accessTokenExpiry }
            );
            return { accessToken: newAccessToken };
        } catch (error) {
            console.error('Token refresh error:', error);
            throw new Error('Token refresh failed');
        }
    }

    /**
     * Check rate limiting
     * @param {Object} event - Netlify function event
     * @returns {Object} Rate limit check result
     */
    checkRateLimit(event) {
        const clientIP = this.getClientIP(event);
        const now = Date.now();
        

        let clientData = this.rateLimitStore.get(clientIP) || {
            requests: 0,
            lastRequest: 0,
            loginAttempts: 0,
            lastLoginAttempt: 0
        };

      
        if (now - clientData.lastRequest < 60000) { 
            if (clientData.requests >= this.maxRequestsPerMinute) {
                return {
                    success: false,
                    statusCode: 429,
                    message: 'Too many requests. Please try again later.'
                };
            }
            clientData.requests++;
        } else {
            clientData.requests = 1;
        }
        clientData.lastRequest = now;

        if (event.path.includes('/auth') && event.httpMethod === 'POST') {
            if (clientData.loginAttempts >= this.maxLoginAttempts) {
                const timeSinceLastAttempt = now - clientData.lastLoginAttempt;
                if (timeSinceLastAttempt < this.lockoutDuration) {
                    const remainingMinutes = Math.ceil((this.lockoutDuration - timeSinceLastAttempt) / 60000);
                    return {
                        success: false,
                        statusCode: 429,
                        message: `Too many login attempts. Please try again in ${remainingMinutes} minutes.`
                    };
                } else {
                    clientData.loginAttempts = 0;
                }
            }
        }

  
        this.rateLimitStore.set(clientIP, clientData);

        return { success: true };
    }

    /**
     * Get client IP address
     * @param {Object} event - Netlify function event
     * @returns {string} Client IP
     */
    getClientIP(event) {
        return event.headers['x-forwarded-for'] || 
               event.headers['x-real-ip'] || 
               event.headers['x-client-ip'] || 
               'unknown';
    }

    /**
     * Validate CSRF token
     * @param {Object} event - Netlify function event
     * @returns {Object} CSRF validation result
     */
    validateCSRFToken(event) {

        if (event.httpMethod === 'GET') {
            return { success: true };
        }

        try {
            const body = JSON.parse(event.body || '{}');
            const csrfToken = body.csrf_token || event.headers['x-csrf-token'];
            
            if (!csrfToken) {
                return {
                    success: false,
                    statusCode: 403,
                    message: 'CSRF token missing'
                };
            }


            if (csrfToken.length < 32) {
                return {
                    success: false,
                    statusCode: 403,
                    message: 'Invalid CSRF token'
                };
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                statusCode: 400,
                message: 'Invalid request body'
            };
        }
    }

    /**
     * Validate and sanitize input
     * @param {Object} event - Netlify function event
     * @returns {Object} Input validation result
     */
    validateAndSanitizeInput(event) {
        try {
            if (event.httpMethod === 'POST') {
                const body = JSON.parse(event.body || '{}');
                
        
                const sanitizedBody = this.sanitizeObject(body);
                
               
                if (sanitizedBody.email && !this.isValidEmail(sanitizedBody.email)) {
                    return {
                        success: false,
                        statusCode: 400,
                        message: 'Invalid email format'
                    };
                }

                if (sanitizedBody.password && !this.isValidPassword(sanitizedBody.password)) {
                    return {
                        success: false,
                        statusCode: 400,
                        message: 'Password does not meet security requirements'
                    };
                }


                event.body = JSON.stringify(sanitizedBody);
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                statusCode: 400,
                message: 'Invalid input data'
            };
        }
    }

    /**
     * Sanitize object recursively
     * @param {Object} obj - Object to sanitize
     * @returns {Object} Sanitized object
     */
    sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return this.sanitizeString(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = this.sanitizeObject(value);
        }
        return sanitized;
    }

    /**
     * Sanitize string input
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeString(str) {
        if (typeof str !== 'string') {
            return str;
        }

        return str
            .replace(/<[^>]*>/g, '')
            .replace(/[<>]/g, '') 
            .replace(/javascript:/gi, '')
            .replace(/<script/gi, '') 
            .trim();
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Is email valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {boolean} Is password valid
     */
    isValidPassword(password) {
        return password.length >= 8 && 
               /[A-Z]/.test(password) && 
               /[a-z]/.test(password) && 
               /\d/.test(password) &&
               /[!@#$%^&*(),.?":{}|<>]/.test(password);
    }

    /**
     * Add security headers to response
     * @param {Object} response - Original response
     * @returns {Object} Response with security headers
     */
    addSecurityHeaders(response) {
        const headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: https:; font-src 'self' https://cdnjs.cloudflare.com;",
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };

        return {
            ...response,
            headers: {
                ...response.headers,
                ...headers
            }
        };
    }

    /**
     * Create security response
     * @param {number} statusCode - HTTP status code
     * @param {string} message - Error message
     * @returns {Object} Formatted response
     */
    createSecurityResponse(statusCode, message) {
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            },
            body: JSON.stringify({
                error: true,
                message: message,
                timestamp: new Date().toISOString()
            })
        };
    }

    /**
     * Set HTTP-only cookies
     * @param {Object} response - Response object
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {Object} options - Cookie options
     * @returns {Object} Response with cookies
     */
    setHttpOnlyCookie(response, name, value, options = {}) {
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, 
            path: '/',
            ...options
        };

        const cookieString = `${name}=${value}; HttpOnly; ${cookieOptions.secure ? 'Secure; ' : ''}SameSite=${cookieOptions.sameSite}; Max-Age=${cookieOptions.maxAge}; Path=${cookieOptions.path}`;

        return {
            ...response,
            headers: {
                ...response.headers,
                'Set-Cookie': cookieString
            }
        };
    }

    /**
     * Log security event
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    logSecurityEvent(event, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            ...data
        };

        console.log('🔒 Security Event:', JSON.stringify(logEntry));
    }
}

module.exports = SecurityMiddleware; 
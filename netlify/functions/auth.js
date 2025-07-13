const SecurityMiddleware = require('./security-middleware');
const security = new SecurityMiddleware();

exports.handler = security.middleware(async (event, context) => {
    try {

        security.logSecurityEvent('auth_request', {
            method: event.httpMethod,
            path: event.path,
            userAgent: event.headers['user-agent']
        });

        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            
            if (event.path.includes('/login')) {
                return await handleLogin(body, security);
            } else if (event.path.includes('/refresh')) {
                return await handleTokenRefresh(body, security);
            }
        }

        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            },
            body: JSON.stringify({
                error: true,
                message: 'ThemeHackers Security: Endpoint not found'
            })
        };

    } catch (error) {
        console.error('Auth function error:', error);
        return security.createSecurityResponse(500, 'ThemeHackers Security: Internal server error');
    }
});

/**
 * Handle user login
 */
async function handleLogin(body, security) {
    try {
        const { email, password } = body;

       
        if (!email || !password) {
            return security.createSecurityResponse(400, 'ThemeHackers Security: Email and password required');
        }

        const mockUser = {
            id: 'user123',
            email: 'demo@themehackers.com',
            passwordHash: await security.hashPassword('ThemeHackers2024!'),
            fullName: 'ThemeHackers Demo User'
        };

     
        const isValidPassword = await security.comparePassword(password, mockUser.passwordHash);
        
        if (!isValidPassword) {
            security.logSecurityEvent('login_failed', { email });
            return security.createSecurityResponse(401, 'ThemeHackers Security: Invalid credentials');
        }

    
        const tokens = security.generateTokens({
            userId: mockUser.id,
            email: mockUser.email,
            fullName: mockUser.fullName
        });

     
        security.logSecurityEvent('login_success', { 
            userId: mockUser.id, 
            email: mockUser.email 
        });

       
        let response = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            },
            body: JSON.stringify({
                success: true,
                message: 'ThemeHackers Security: Login successful',
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    fullName: mockUser.fullName
                }
            })
        };

        
        response = security.setHttpOnlyCookie(response, 'access_token', tokens.accessToken, {
            maxAge: 15 * 60 * 1000 
        });
        
        response = security.setHttpOnlyCookie(response, 'refresh_token', tokens.refreshToken, {
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return security.createSecurityResponse(500, 'ThemeHackers Security: Login failed');
    }
}

/**
 * Handle token refresh
 */
async function handleTokenRefresh(body, security) {
    try {
        const { refreshToken } = body;

        if (!refreshToken) {
            return security.createSecurityResponse(400, 'ThemeHackers Security: Refresh token required');
        }

    
        const decoded = security.verifyToken(refreshToken, security.refreshSecret);
        
        
        const newAccessToken = security.generateTokens({
            userId: decoded.userId,
            email: decoded.email,
            fullName: decoded.fullName
        }).accessToken;

       
        security.logSecurityEvent('token_refresh', { 
            userId: decoded.userId 
        });


        let response = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            },
            body: JSON.stringify({
                success: true,
                message: 'ThemeHackers Security: Token refreshed successfully'
            })
        };


        response = security.setHttpOnlyCookie(response, 'access_token', newAccessToken, {
            maxAge: 15 * 60 * 1000 
        });

        return response;

    } catch (error) {
        console.error('Token refresh error:', error);
        return security.createSecurityResponse(401, 'ThemeHackers Security: Invalid refresh token');
    }
} 
/**
 * Build Script for Environment Variable Injection
 * 
 * This script injects Netlify environment variables into HTML files
 * so they can be accessed by client-side JavaScript.
 * 
 * @author ThemeHackers Security Team
 * @version 1.0.1
 */

const fs = require('fs');
const path = require('path');

// Environment variables to inject
const envVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN', 
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_MEASUREMENT_ID'
];

// Check if we're in Netlify build environment
const isNetlify = process.env.NETLIFY === 'true';
console.log('🌐 Build environment:', isNetlify ? 'Netlify' : 'Local');
console.log('📁 Current directory:', process.cwd());
console.log('📦 Package.json exists:', fs.existsSync('package.json'));

/**
 * Inject environment variables into HTML file
 */
function injectEnvVarsIntoHTML(filePath) {
    try {
        console.log(`📝 Processing: ${filePath}`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if file already has environment injection
        if (content.includes('firebase-api-key')) {
            console.log(`⚠️  File already has environment injection: ${filePath}`);
            return;
        }
        
        // Find the head tag
        const headMatch = content.match(/<head[^>]*>/i);
        if (!headMatch) {
            console.log(`⚠️  No head tag found in: ${filePath}`);
            return;
        }
        
        // Create meta tags for environment variables
        const metaTags = envVars.map(varName => {
            const value = process.env[varName] || '';
            return `    <meta name="${varName.toLowerCase()}" content="${value}">`;
        }).join('\n');
        
        // Insert meta tags after head tag
        const headTag = headMatch[0];
        const injectionPoint = headTag + '\n' + metaTags;
        
        content = content.replace(headTag, injectionPoint);
        
        // Write back to file
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Injected environment variables into: ${filePath}`);
        
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
}

/**
 * Create JavaScript object with environment variables
 */
function createEnvScript() {
    const envObject = {};
    
    envVars.forEach(varName => {
        envObject[varName] = process.env[varName] || '';
    });
    
    const scriptContent = `
// Environment variables injected by build script
window.ENV = ${JSON.stringify(envObject, null, 2)};
window.FIREBASE_CONFIG = {
    apiKey: "${process.env.FIREBASE_API_KEY || ''}",
    authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
    projectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
    storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
    messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
    appId: "${process.env.FIREBASE_APP_ID || ''}",
    measurementId: "${process.env.FIREBASE_MEASUREMENT_ID || ''}"
};
`;
    
    const scriptPath = path.join(__dirname, 'public', 'js', 'env-config.js');
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    console.log(`✅ Created environment config script: ${scriptPath}`);
}

/**
 * Main build function
 */
function build() {
    console.log('🚀 Starting environment variable injection...');
    
    // Check if public directory exists
    if (!fs.existsSync('public')) {
        console.error('❌ Public directory not found!');
        process.exit(1);
    }
    
    // List of HTML files to process
    const htmlFiles = [
        'public/index.html',
        'public/login.html',
        'public/dashboard.html',
        'public/course.html',
        'public/learning.html',
        'public/schedule.html',
        'public/contact.html'
    ];
    
    let processedFiles = 0;
    
    // Process each HTML file
    htmlFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            injectEnvVarsIntoHTML(filePath);
            processedFiles++;
        } else {
            console.log(`⚠️  File not found: ${filePath}`);
        }
    });
    
    console.log(`📝 Processed ${processedFiles} HTML files`);
    
    // Create environment config script
    createEnvScript();
    
    console.log('✅ Environment variable injection completed!');
}

// Run build if this script is executed directly
if (require.main === module) {
    build();
}

module.exports = { build, injectEnvVarsIntoHTML, createEnvScript }; 
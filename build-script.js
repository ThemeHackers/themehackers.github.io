const fs = require('fs');
const path = require('path');


const envVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN', 
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_MEASUREMENT_ID'
];


const isNetlify = process.env.NETLIFY === 'true';
console.log('🌐 Build environment:', isNetlify ? 'Netlify' : 'Local');
console.log('📁 Current directory:', process.cwd());
console.log('📦 Package.json exists:', fs.existsSync('package.json'));


function simpleBuild() {
    console.log('🚀 Simple build script running...');
    console.log('📁 Checking directory structure...');
    
    
    if (fs.existsSync('public')) {
        console.log('✅ Public directory found');
        
       
        const publicFiles = fs.readdirSync('public');
        console.log('📁 Files in public directory:', publicFiles);
        
        
        const htmlFiles = publicFiles.filter(file => file.endsWith('.html'));
        console.log('📄 HTML files found:', htmlFiles);
        
    } else {
        console.log('⚠️  Public directory not found');
    }
    
    console.log('✅ Build completed successfully!');
}


function injectEnvVarsIntoHTML(filePath) {
    try {
        console.log(`📝 Processing: ${filePath}`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        
      
        if (content.includes('firebase-api-key')) {
            console.log(`⚠️  File already has environment injection: ${filePath}`);
            return;
        }
        
       
        const headMatch = content.match(/<head[^>]*>/i);
        if (!headMatch) {
            console.log(`⚠️  No head tag found in: ${filePath}`);
            return;
        }
        
       
        const metaTags = envVars.map(varName => {
            const value = process.env[varName] || '';
            return `    <meta name="${varName.toLowerCase()}" content="${value}">`;
        }).join('\n');
        
       
        const headTag = headMatch[0];
        const injectionPoint = headTag + '\n' + metaTags;
        
        content = content.replace(headTag, injectionPoint);
        
      
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Injected environment variables into: ${filePath}`);
        
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
}



function createEnvScript() {
    const envObject = {};
    
    envVars.forEach(varName => {
        envObject[varName] = process.env[varName] || '';
    });
    
    const scriptContent = `

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

function build() {
    console.log('🚀 Starting environment variable injection...');
    

    if (!fs.existsSync('public')) {
        console.error('❌ Public directory not found!');
        process.exit(1);
    }
    

    const htmlFiles = [
        'public/index.html',
        'public/login.html',
        'public/dashboard.html',
        'public/pv_student.html'
    ];
    
    let processedFiles = 0;
    

    htmlFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            injectEnvVarsIntoHTML(filePath);
            processedFiles++;
        } else {
            console.log(`⚠️  File not found: ${filePath}`);
        }
    });
    
    console.log(`📝 Processed ${processedFiles} HTML files`);
    

    createEnvScript();
    
    console.log('✅ Environment variable injection completed!');
}


if (require.main === module) {
    
    if (fs.existsSync('package.json')) {
        console.log('📦 Package.json found, running full build...');
        build();
    } else {
        console.log('⚠️  No package.json found, running simple build...');
        simpleBuild();
    }
}

module.exports = { build, injectEnvVarsIntoHTML, createEnvScript, simpleBuild }; 

const fs = require('fs');
const path = require('path');

const directory = 'c:\\Users\\UI_1\\react.js';

function replaceColors(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        
        // Skip node_modules or build folders just in case, though we are in src
        if (file === 'node_modules' || file === 'build' || file === '.git' || file === 'dist' || file === '.gemini') continue;

        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            replaceColors(fullPath);
        } else if (fullPath.endsWith('.css') || fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = content;
            
            // Replace hex codes (case insensitive)
            updated = updated.replace(/#6C63FF/ig, '#79334D');
            
            // Replace RGB with flexible spaces
            updated = updated.replace(/108,\s*99,\s*255/g, '121, 51, 77');
            
            if (content !== updated) {
                fs.writeFileSync(fullPath, updated, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

replaceColors(directory);
console.log('Color replacement complete.');

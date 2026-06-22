import fs from 'fs';
import path from 'path';

const rootDir = '.'; 
const outputFile = 'scanned_files.js';

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        // Normalize slashes for web URLs
        const relativePath = filePath.split(path.sep).join('/');

        if (stat.isDirectory()) {
            // Only skip git and node_modules to prevent local crash
            if (file !== '.git' && file !== 'node_modules') {
                walk(filePath, fileList);
            }
        } else {
            // Grab everything except the scanner tools
            if (file !== 'scanner.js' && file !== outputFile) {
                fileList.push({ url: '/' + relativePath, name: file, dest: relativePath });
            }
        }
    }
    return fileList;
}

const allFiles = walk(rootDir);
let scriptContent = 'window.GENERATED_FILE_LIST = [\n';

// Loop and apply the 9-files-per-line formatting
for (let i = 0; i < allFiles.length; i++) {
    scriptContent += JSON.stringify(allFiles[i]);
    
    if (i < allFiles.length - 1) {
        scriptContent += ', ';
        // Add a line break every 9 items
        if ((i + 1) % 9 === 0) {
            scriptContent += '\n';
        }
    }
}
scriptContent += '\n];';

fs.writeFileSync(outputFile, scriptContent);
console.log(`Success. Scanned ${allFiles.length} files and packed them 9 per line in ${outputFile}.`);
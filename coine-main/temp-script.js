// This is a temporary script to update the auth page icons
import fs from 'fs';

// Read the auth page file
const authPagePath = 'client/src/pages/auth-page.tsx';
let content = fs.readFileSync(authPagePath, 'utf-8');

// Replace all occurrences of text-primary-500 in icon elements
content = content.replace(/<(Mail|Lock|User) className="h-4 w-4 text-primary-500"/g, 
                         '<$1 className="h-4 w-4 text-green-500"');

// Write the changes back to the file
fs.writeFileSync(authPagePath, content);
console.log('Updated auth page icons');
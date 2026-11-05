import { copyFile } from 'node:fs/promises';
await copyFile('src/styles.css', 'dist/styles.css');
await copyFile('src/styles.d.ts', 'dist/styles.d.ts');

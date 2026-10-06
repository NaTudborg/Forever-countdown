// Bot-Hosting's Node runtime defaults to /home/container/index.js.
// Keep this compatibility entrypoint while the package's npm start script
// remains the preferred local and Docker startup path.
await import('./dist/src/index.js');

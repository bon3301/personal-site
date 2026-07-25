import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(
    new URL('.', import.meta.url)
);

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true
            }
        }
    },
    build: {
        rolldownOptions: {
            input: {
                home: resolve(projectRoot, 'index.html'),
                blog: resolve(projectRoot, 'blog/index.html'),
                admin: resolve(projectRoot, 'admin/index.html')
            }
        }
    }
});

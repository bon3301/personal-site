import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(
    new URL('.', import.meta.url)
);

function blogPostRoutes() {
    return {
        name: 'blog-post-routes',

        configureServer(server) {
            server.middlewares.use(
                (request, response, next) => {
                    const url = request.url || '';
                    const pathname = url.split('?')[0];

                    if (
                        /^\/blog\/[a-z0-9-]+\/?$/.test(pathname) &&
                        pathname !== '/blog/post/' &&
                        pathname !== '/blog/post'
                    ) {
                        request.url = '/blog/post/index.html';
                    }

                    next();
                }
            );
        }
    };
}

export default defineConfig({
    plugins: [
        blogPostRoutes()
    ],

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
                admin: resolve(projectRoot, 'admin/index.html'),
                article: resolve(
                    projectRoot,
                    'blog/post/index.html'
                )
            }
        }
    }
});

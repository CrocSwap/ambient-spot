import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

export default defineConfig({
    base: '/',
    plugins: [
        react(),
        {
            name: 'html-transform',
            transformIndexHtml(html) {
                const gitHash = execSync('git rev-parse --short HEAD')
                    .toString()
                    .trim();
                return html
                    .replace(/__BUILD_TIME__/g, Date.now().toString())
                    .replace(/__PRINT__/g, gitHash)
                    .replace(
                        /__VERSION__/g,
                        process.env.npm_package_version || '1.0.0',
                    );
            },
        },
        visualizer({
            open: false, // Automatically open the report in the browser
        }),
    ],
    define: {
        'import.meta.env': {},
        global: {},
        'process.env': {}, // Prevents "process is not defined" errors
        'process.env.NEXT_PUBLIC_SECURE_SITE_ORIGIN': JSON.stringify(
            process.env.NEXT_PUBLIC_SECURE_SITE_ORIGIN ||
                'https://secure.walletconnect.org',
        ),
    },
    server: {
        port: 3000,
    },
    build: {
        outDir: 'build',
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    },
});

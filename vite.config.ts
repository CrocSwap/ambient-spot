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
        // Warm up the most-imported entry & route files so the dev server has
        // them transformed before the first request. Speeds up cold start.
        warmup: {
            clientFiles: [
                './src/index.tsx',
                './src/App/App.tsx',
                './src/contexts/index.ts',
            ],
        },
    },
    optimizeDeps: {
        // Pre-bundle these once at startup. Some are CJS-only and Vite/Rolldown
        // misroutes their default export — keeping them in the dep cache avoids
        // re-optimization stalls during navigation.
        include: [
            'react',
            'react-dom',
            'react-dom/client',
            'react-router-dom',
            'ethers',
            '@mui/material',
            '@mui/material/styles',
            'framer-motion',
            'react-icons/ai',
            'react-icons/bs',
            'react-icons/fi',
            'react-icons/io5',
            'react-icons/md',
            'react-icons/ri',
            'react-icons/sl',
            'react-blockies',
            'react-jazzicon',
            'react-use-websocket',
            'emoji-picker-react',
            'react-color',
            'react-transition-group',
        ],
    },
    build: {
        outDir: 'build',
        // Single-chunk bundle is large; raise the warning threshold so the
        // log isn't dominated by a noisy warning we've intentionally accepted.
        chunkSizeWarningLimit: 8000,
        rollupOptions: {
            output: {
                // Disable code splitting to avoid circular-dependency issues
                // between auto-generated shared chunks (viem / @reown/appkit)
                // that surface as "Class extends value undefined" at runtime.
                inlineDynamicImports: true,
            },
        },
    },
});

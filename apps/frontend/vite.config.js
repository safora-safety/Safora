import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: process.env.VITE_BACKEND_URL || 'https://safora-backend.onrender.com',
                changeOrigin: true,
                secure: false,
            },
            '/socket.io': {
                target: process.env.VITE_SOCKET_URL || 'https://safora-backend.onrender.com',
                ws: true,
                changeOrigin: true,
            },
        },
    },
});

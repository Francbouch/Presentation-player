import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {autonomousExportPlugin} from './scripts/autonomous-runtime.mjs';

export default defineConfig({ plugins: [react(),autonomousExportPlugin()] });

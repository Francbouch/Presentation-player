import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './editor.css';
import './buttons.css';
import './layers.css';
import './text.css';

createRoot(document.getElementById('root')).render(<App />);

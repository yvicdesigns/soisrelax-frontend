import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1A1A2E',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '15px',
              padding: '14px 20px',
            },
            success: { iconTheme: { primary: '#4CAF50', secondary: '#fff' } },
            error: { iconTheme: { primary: '#FF3B30', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

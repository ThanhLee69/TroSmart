import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'antd/dist/reset.css';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
   <React.StrictMode>
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#536ee7ff',
                    borderRadius: 5,
                },
            }}
        >
            <AuthProvider>
               <PermissionProvider>
                  <App />
               </PermissionProvider>
            </AuthProvider>
        </ConfigProvider>
    </React.StrictMode>,
);
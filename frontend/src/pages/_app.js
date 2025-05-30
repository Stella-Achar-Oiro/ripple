// src/pages/_app.js
import { AuthProvider } from '../context/AuthContext';
import '../styles/globals.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/auth.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
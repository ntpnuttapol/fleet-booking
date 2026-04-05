import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '60px auto' }}>
                    <h2 style={{ color: '#E53935', marginBottom: 12 }}>Something went wrong</h2>
                    <p style={{ color: '#555', marginBottom: 16 }}>The app encountered an error. Try clearing your browser data for this site and refreshing.</p>
                    <button onClick={() => { localStorage.removeItem('fleetbook_token'); window.location.href = '/'; }} style={{ padding: '10px 20px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, marginBottom: 20 }}>Clear session &amp; reload</button>
                    <details style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 8, fontSize: 13 }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>Error Details</summary>
                        <p><strong>Error:</strong> {this.state.error && String(this.state.error)}</p>
                        <p><strong>Stack:</strong></p>
                        <pre style={{ overflow: 'auto', fontSize: 11 }}>{this.state.errorInfo && String(this.state.errorInfo.componentStack)}</pre>
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)

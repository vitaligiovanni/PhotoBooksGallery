import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  info?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined, info: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ fontFamily: 'Inter, sans-serif', padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '1rem' }}>Произошла ошибка</h1>
          <p style={{ marginBottom: '1rem' }}>Компонент не загрузился. Вы можете перезагрузить страницу.</p>
          {this.state.error && (
            <pre style={{ background: '#1f2937', color: '#f9fafb', padding: '1rem', borderRadius: 8, overflow: 'auto', fontSize: 12 }}>
              {this.state.error.message}\n\n{this.state.error.stack}
            </pre>
          )}
          <button onClick={this.handleReload} style={{ marginTop: '1rem', background: '#111827', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 6 }}>
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

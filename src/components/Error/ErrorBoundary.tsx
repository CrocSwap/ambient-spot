import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
    fallback: React.FC<{ error: Error | null }>;
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Caught error in ErrorBoundary:', error, errorInfo);
    }

    render() {
        const { hasError, error } = this.state;
        const { fallback: FallbackComponent } = this.props;

        if (hasError) {
            return <FallbackComponent error={error} />;
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

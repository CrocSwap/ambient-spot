import React from 'react';
import ambiBg from '../../assets/images/home/home_wallpaper.webp';
import Button from '../Form/Button';
import styles from './GlobalErrorFallback.module.css';
interface GlobalErrorFallbackProps {
    error?: Error | null;
}

const GlobalErrorFallback: React.FC<GlobalErrorFallbackProps> = ({ error }) => {
    const handleCopyError = () => {
        if (error) {
            navigator.clipboard
                .writeText(
                    error.stack?.includes(error.message)
                        ? error.stack + ' | ' + window.location
                        : error.message +
                              ' | ' +
                              error.stack +
                              ' | ' +
                              window.location,
                )
                .then(
                    () => {
                        alert('Error details copied to clipboard!');
                    },
                    () => {
                        alert('Failed to copy error details.');
                    },
                );
        }
    };

    return (
        <div
            className={styles.errorContainer}
            style={{
                background: `${ambiBg} no-repeat
        center center fixed`,
            }}
        >
            <h1 className={styles.errorTitle}>Something went wrong</h1>
            {error && (
                <pre className={styles.errorDetails}>{error.message}</pre>
            )}
            <div className={styles.buttonGroup}>
                <Button
                    idForDOM='global_error_copy'
                    flat
                    title='Copy Error Details'
                    action={handleCopyError}
                />
                <Button
                    idForDOM='global_error_refresh'
                    flat
                    title='Refresh Page'
                    action={() => window.location.reload()}
                />
            </div>
        </div>
    );
};

export default GlobalErrorFallback;

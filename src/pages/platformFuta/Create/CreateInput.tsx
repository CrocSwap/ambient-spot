import React, { useState, useEffect, ChangeEvent } from 'react';
import styles from './CreateInput.module.css';

interface CreateInputProps {
    tickerInput: string;
    handleChange: (value: string) => void;
}
const TICKER_INPUT_ID = 'ticker_input';
const TICKER_MAX_LENGTH = 10;

const CreateInput: React.FC<CreateInputProps> = ({
    tickerInput = '',
    handleChange,
}) => {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [overflowValue, setOverflowValue] = useState<string>('');

    useEffect(() => {
        const inputValue = String(tickerInput || '');
        if (inputValue.length > TICKER_MAX_LENGTH) {
            setDisplayValue(inputValue.slice(0, TICKER_MAX_LENGTH));
            setOverflowValue(inputValue.slice(TICKER_MAX_LENGTH));
        } else {
            setDisplayValue(inputValue);
            setOverflowValue('');
        }
    }, [tickerInput, TICKER_MAX_LENGTH]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
        handleChange(e.target.value);
    };

    useEffect(() => {
        const input = document.getElementById(
            TICKER_INPUT_ID,
        ) as HTMLInputElement;
        if (input) input.focus();
    }, []);

    return (
        <div className={styles.create_token_middle}>
            <div className={styles.ticker_input_fields}>
                <label htmlFor={TICKER_INPUT_ID}>
                    <h4>Token Ticker</h4>
                </label>
                <div
                    className={`${styles.inputContainer} ${
                        tickerInput.length > TICKER_MAX_LENGTH
                            ? styles.errorInput
                            : ''
                    }`}
                >
                    <div className={styles.inputWrapper}>
                        <input
                            name={TICKER_INPUT_ID}
                            id={TICKER_INPUT_ID}
                            value={tickerInput}
                            type='text'
                            onChange={handleInputChange}
                            autoCorrect='off'
                            spellCheck={false}
                            autoComplete='off'
                            className={styles.hiddenInput}
                        />
                        <div className={styles.textOverlay}>
                            <span className={styles.normalText}>
                                {displayValue}
                            </span>
                            <span className={styles.overflowText}>
                                {overflowValue}
                            </span>
                        </div>
                    </div>

                    <p
                        className={
                            tickerInput.length > TICKER_MAX_LENGTH
                                ? styles.errorText
                                : ''
                        }
                    >
                        {TICKER_MAX_LENGTH - tickerInput.length}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CreateInput;

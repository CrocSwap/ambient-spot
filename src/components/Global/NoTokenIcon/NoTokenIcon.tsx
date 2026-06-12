import styles from './NoTokenIcon.module.css';

interface propsIF {
    tokenInitial: string | null;
    width?: string;
}
export default function NoTokenIcon(props: propsIF) {
    const { tokenInitial, width } = props;

    const widthStyle = width ? width : '30px';
    return (
        <div
            className={styles.no_token_icon}
            style={{
                width: widthStyle,
                height: widthStyle,
                textTransform: 'none',
            }}
        >
            <div className={styles.sub_container}>
                <p>{tokenInitial ?? ''}</p>
            </div>
        </div>
    );
}

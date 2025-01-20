import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';
import ambiBg from '../../../assets/images/home/home_wallpaper.webp';
import futaBg from '../../../assets/futa/home/hexBg.png';
import { brand } from '../../../ambient-utils/constants';
export default function NotFound() {
    const isFuta = brand === 'futa';

    return (
        <div
            className={styles.flexContainer}
            style={{
                background: `${isFuta ? futaBg : ambiBg} no-repeat
    center center fixed`,
            }}
        >
            <div className={styles.textCenter}>
                <h1>
                    <span
                        className={`${styles.fadeIn} ${styles.digit}`}
                        id='digit1'
                    >
                        4
                    </span>
                    <span
                        className={`${styles.fadeIn} ${styles.digit}`}
                        id='digit2'
                    >
                        0
                    </span>
                    <span
                        className={`${styles.fadeIn} ${styles.digit}`}
                        id='digit3'
                    >
                        4
                    </span>
                </h1>
                <h3 className={styles.fadeIn}>PAGE NOT FOUND</h3>
                <Link to='/' className={styles.button}>
                    Return To Home
                </Link>
            </div>
        </div>
    );
}

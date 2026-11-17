import { memo, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Vanity() {
    const { params } = useParams();

    useEffect(() => {
        let destination = '/';
        switch (params?.toUpperCase()) {
            case 'SCRETH':
            case 'ETHSCR':
            case 'SCR':
            case 'SCROLL':
                destination =
                    '/trade/market/chain=0x82750&tokenA=0x0000000000000000000000000000000000000000&tokenB=0xd29687c813d741e2f938f4ac377128810e217b1b';
                break;
        }

        window.location.replace(destination);
    }, [params]);

    return null; // No need to render anything since we're redirecting
}

export default memo(Vanity);

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Loader from '../Loader/Loader';

const TransitionProvider = ({ children }) => {
    const pathname = usePathname();
    const [isTransitioning, setIsTransitioning] = useState(false);

    const variants = {
        hidden: {
            opacity: 0,
            scale: 1.1,
            transition: { duration: 0.5, ease: 'easeInOut' }
        },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.5, ease: 'easeInOut' }
        },
        exit: {
            opacity: 0,
            scale: 0.1,
            transition: { duration: 0.7, ease: 'easeIn' }
        }
    };

    return (
        <>
            <AnimatePresence>
                {isTransitioning && <Loader />}
            </AnimatePresence>
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={pathname}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={variants}
                    onAnimationStart={definition => {
                        if (definition === 'exit') {
                           setIsTransitioning(true);
                        }
                    }}
                    onAnimationComplete={definition => {
                        if (definition === 'visible') {
                            setIsTransitioning(false);
                        }
                    }}
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </>
    );
};

export default TransitionProvider; 
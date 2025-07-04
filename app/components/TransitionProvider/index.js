'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Loader from '../Loader/Loader';

const TransitionProvider = ({ children }) => {
    const pathname = usePathname();
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        let timer;
        if (pathname) {
            setIsTransitioning(true);
            timer = setTimeout(() => {
                setIsTransitioning(false);
            }, 800); // Должно быть чуть больше, чем transition.duration в exit
        }
        return () => clearTimeout(timer);
    }, [pathname]);


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
            y: "50%",
            transition: { duration: 0.7, ease: 'easeIn' }
        }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
            >
                {isTransitioning && <Loader />}
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default TransitionProvider; 
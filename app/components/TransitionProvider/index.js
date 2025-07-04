'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const TransitionProvider = ({ children }) => {
    const pathname = usePathname();

    const variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default TransitionProvider; 
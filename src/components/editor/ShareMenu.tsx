import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2 } from 'lucide-react';

/** Share button with a popup of social share links for the current page. */
export function ShareMenu() {
  const [open, setOpen] = useState(false);

  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent('Check out this meme I made on MK ViralCanvas!');

  const targets = [
    {
      name: 'Twitter/X',
      url: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
    },
    {
      name: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    },
    {
      name: 'Reddit',
      url: `https://www.reddit.com/submit?url=${shareUrl}&title=${shareText}`,
    },
    {
      name: 'WhatsApp',
      url: `https://wa.me/?text=${shareText}%20${shareUrl}`,
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-surface-elevated border border-border hover:border-border-strong text-text-primary p-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-sm font-semibold"
        aria-expanded={open}
      >
        <Share2 className="w-4 h-4" /> Share
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute bottom-full left-0 right-0 mb-2 card-elevated p-2 space-y-1 z-20"
          >
            {targets.map(s => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 text-xs font-medium rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer"
              >
                {s.name}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

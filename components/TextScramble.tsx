import React, { useState, useEffect, useRef } from 'react';

interface TextScrambleProps {
  text: string;
  className?: string;
  speed?: number; // Speed of decoding
  scrambleSpeed?: number; // Speed of character cycling
  delay?: number; // Initial delay
  reveal?: boolean; // Trigger reveal
}

const CHARS = '!<>-_\\/[]{}—=+*^?#________';

export const TextScramble: React.FC<TextScrambleProps> = ({ 
    text, 
    className, 
    speed = 40,
    scrambleSpeed = 30,
    delay = 0,
    reveal = true
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const queue = useRef<{from: string, to: string, start: number, end: number, char?: string}[]>([]);
  const frameRequest = useRef<number>(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!reveal) return;
    
    // Reset
    setIsDone(false);
    frame.current = 0;
    queue.current = [];
    
    // Build Queue
    let counter = 0;
    for (let i = 0; i < text.length; i++) {
        const from = CHARS[Math.floor(Math.random() * CHARS.length)];
        const to = text[i];
        const start = Math.floor(Math.random() * 40) + counter;
        const end = start + Math.floor(Math.random() * 40);
        queue.current.push({ from, to, start, end });
        counter += 1; // Stagger effect
    }

    cancelAnimationFrame(frameRequest.current);
    
    const update = () => {
        let output = '';
        let complete = 0;
        
        for (let i = 0, n = queue.current.length; i < n; i++) {
            let { from, to, start, end, char } = queue.current[i];
            
            if (frame.current >= end) {
                complete++;
                output += to;
            } else if (frame.current >= start) {
                if (!char || Math.random() < 0.28) {
                    char = CHARS[Math.floor(Math.random() * CHARS.length)];
                    queue.current[i].char = char;
                }
                output += `<span class="opacity-50 text-pey-accent">${char}</span>`;
            } else {
                output += from;
            }
        }

        setDisplayText(output);

        if (complete === queue.current.length) {
            setIsDone(true);
        } else {
            frameRequest.current = requestAnimationFrame(update);
            frame.current += (speed / 100); // Control speed
        }
    };

    const timeout = setTimeout(() => {
        update();
    }, delay);

    return () => {
        clearTimeout(timeout);
        cancelAnimationFrame(frameRequest.current);
    };

  }, [text, reveal, delay, speed]);

  return (
    <span 
        className={className} 
        dangerouslySetInnerHTML={{ __html: displayText || '&nbsp;' }} 
        aria-label={text}
    />
  );
};
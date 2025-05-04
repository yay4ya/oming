import React from 'react';

type Callback = () => void;

export const useInterval = (callback: Callback, delay?: number | null): void => {
  const savedCallback = React.useRef<Callback>(() => { });
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  React.useEffect(() => {
    if (delay !== null && savedCallback.current) {
      const interval = setInterval(savedCallback.current, delay);
      return () => {
        clearInterval(interval);
      };
    }
    return undefined;
  }, [delay]);
};

import React, { useState, useEffect } from 'react';

export default function TestComponent() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('TestComponent mounted');
    
    // Increment count every second
    const interval = setInterval(() => {
      setCount(prev => prev + 1);
    }, 1000);

    return () => {
      console.log('TestComponent unmounting');
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <h1>Test Component</h1>
      <p>Count: {count}</p>
    </div>
  );
}

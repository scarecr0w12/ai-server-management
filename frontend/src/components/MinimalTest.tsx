import React, { useEffect } from 'react';

function MinimalTest() {
  console.log('MinimalTest rendering');

  useEffect(() => {
    console.log('MinimalTest mounted');
    
    return () => {
      console.log('MinimalTest unmounting');
    };
  }, []);

  return (
    <div>
      <h1>Minimal Test Component</h1>
      <p>This is a minimal test component to isolate mounting/unmounting issues.</p>
    </div>
  );
}

export default MinimalTest;

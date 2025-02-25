import React from 'react';
import TwitchAuth from '../src/components/TwitchAuth';
import Stars from '../src/components/Stars';

const Auth = () => {
  return (
    <div className="container">
      <TwitchAuth />
      <Stars />
    </div>
  );
};

export default Auth;

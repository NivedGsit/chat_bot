import React from 'react';

const Welcome = () => {
  return (
    <div className=" h-screen w-full flex justify-center items-center flex-col">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
        Prototype Version
      </h1>
      <p className="text-gray-600">
      Made to demonstrate and test socket
      </p>
    </div>
  );
};

export default Welcome;
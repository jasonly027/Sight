
import React from 'react';

interface ResponseBoxProps {
  text: string;
  isLoading?: boolean;
}

const ResponseBox = ({ text, isLoading }: ResponseBoxProps) => {
  return (
    <div className="fixed bottom-28 left-4 right-4 bg-black/70 backdrop-blur-md rounded-lg p-4 text-white shadow-lg">
      {isLoading ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200" />
        </div>
      ) : (
        <p className="text-sm leading-relaxed">{text}</p>
      )}
    </div>
  );
};

export default ResponseBox;
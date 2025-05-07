import React from 'react';

const NoEntitySelected: React.FC = () => {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center space-y-2 p-6 bg-card rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold">Select a Client & Entity</h2>
        <p className="text-sm text-muted-foreground">
          Use the context selector in the header to choose a client and entity.
        </p>
        <div className="mt-4 text-xs text-muted-foreground">
          No automatic selection will be made for you.
        </div>
      </div>
    </div>
  );
};

export default NoEntitySelected;
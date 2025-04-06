import React from 'react';
import AdminWebsiteContent from './AdminWebsiteContent';

/**
 * WebsiteContentManagement component that wraps the AdminWebsiteContent component
 * This provides a consistent naming convention with the expected component name
 */
const WebsiteContentManagement: React.FC = () => {
  return <AdminWebsiteContent />;
};

export default WebsiteContentManagement;
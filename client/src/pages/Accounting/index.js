// client/src/pages/Accounting/index.js
import { useState } from 'react';
import { Tabs, Tab, Container } from 'react-bootstrap';
import KontosList from './KontosList';

const Accounting = () => {
  const [activeTab, setActiveTab] = useState('kontos');

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Accounting</h2>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="kontos" title="Chart of Accounts">
          <KontosList />
        </Tab>

        <Tab eventKey="reports" title="Reports">
          <div className="p-4 text-center text-muted">
            <h4>Reports</h4>
            <p>Financial reports and analytics coming soon...</p>
          </div>
        </Tab>

        <Tab eventKey="settings" title="Settings">
          <div className="p-4 text-center text-muted">
            <h4>Accounting Settings</h4>
            <p>Configuration options coming soon...</p>
          </div>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Accounting;

// client/src/components/Breadcrumbs.js
import { Breadcrumb } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';

const Breadcrumbs = ({ items }) => {
  const history = useHistory();

  return (
    <Breadcrumb className="mb-3">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Breadcrumb.Item
            key={index}
            active={isLast}
            onClick={() => !isLast && item.path && history.push(item.path)}
            style={!isLast && item.path ? { cursor: 'pointer' } : {}}
          >
            {item.label}
          </Breadcrumb.Item>
        );
      })}
    </Breadcrumb>
  );
};

export default Breadcrumbs;

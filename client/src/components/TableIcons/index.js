import { ReactComponent as SuccessIcon } from '../../assets/icons/check.svg';
import { ReactComponent as XmarkIcon } from '../../assets/icons/xmark.svg';

const TableIcons = ({ criteria }) => {
  if (criteria) return <SuccessIcon className="table-icon check" />;
  return <XmarkIcon className="table-icon xmark" />;
};

export default TableIcons;

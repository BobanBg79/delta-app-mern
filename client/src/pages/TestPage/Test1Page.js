import { Link } from 'react-router-dom';

const Test1Page = ({ match, location, history }) => {
  console.log('match: ', match);
  console.log('history: ', history);
  console.log('location: ', location);

  const onGoBackClick = () => history.goBack();
  return (
    <div>
      <h1>Test 1</h1>
      <button onClick={onGoBackClick}>Go Back bre</button>
      <Link to="/">Back to Homepage </Link>
    </div>
  );
};

export default Test1Page;

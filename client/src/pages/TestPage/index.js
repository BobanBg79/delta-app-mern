import { Link, Route } from 'react-router-dom';
import Test1Page from './Test1Page';
import Test2Page from './Test2Page';
import { useRouteMatch } from 'react-router';

const TestPage = () => {
  const { path, url } = useRouteMatch();
  console.log(1111, path, url);
  return (
    <div>
      <div className="subroutes">
        <Route path="/test/test1" component={Test1Page} />
        <Route path="/test/test2">
          <Test2Page />
        </Route>
        {/* <Route path={`${url}/:subject`}>
          <Test1Page />

        </Route> */}
        {/* <Test1Page />
        </Route> */}
      </div>
      <div>
        <Link to="/test/test1">Test 1 page</Link>
        <Link to="/test/test2">Test 2 page</Link>
      </div>
    </div>
  );
};

export default TestPage;

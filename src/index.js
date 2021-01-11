import moment from "moment";
import React from "react";
import ReactDOM from "react-dom";

import "./index.css";
import App from "./App";
import { HashRouter, Route } from "react-router-dom";
import {
  QueryParamProvider,
  transformSearchStringJsonSafe,
} from "use-query-params";

const queryStringifyOptions = {
  transformSearchString: transformSearchStringJsonSafe,
};

moment.locale();

ReactDOM.render(
  <HashRouter>
    <QueryParamProvider
      ReactRouterRoute={Route}
      stringifyOptions={queryStringifyOptions}
    >
      <App />
    </QueryParamProvider>
  </HashRouter>,
  document.getElementById("root")
);

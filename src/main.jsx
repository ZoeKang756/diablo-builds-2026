import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import Layout from "./routes/Layout.jsx";
import ListPage from "./routes/ListPage.jsx";
import PageDetail from "./routes/PageDetail.jsx";
import NotFound from "./routes/NotFound.jsx";
import "./index.css";

// 使用 HashRouter（網址為 /#/pages/...），任何主機重新整理都不會 404，不需額外設定伺服器
const router = createHashRouter(
  [
    {
      path: "/",
      element: <Layout />,
      errorElement: <NotFound />,
      children: [
        { index: true, element: <ListPage /> },
        { path: "pages/:slug", element: <PageDetail /> },
        { path: "*", element: <NotFound /> },
      ],
    },
  ]
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

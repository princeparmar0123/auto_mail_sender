import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/campaigns")({
  component: () => <Outlet />,
});

export { Link, useRouterState };
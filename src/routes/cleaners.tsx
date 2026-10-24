import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cleaners")({ component: () => <Outlet /> });

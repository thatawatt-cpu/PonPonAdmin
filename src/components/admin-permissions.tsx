"use client";

import { createContext, useContext } from "react";

export type AdminPermission =
  | "dashboard.read"
  | "orders.read"
  | "orders.manage"
  | "orders.refund"
  | "products.read"
  | "products.manage"
  | "customers.read"
  | "reviews.read"
  | "reviews.manage"
  | "marketing.manage"
  | "integrations.read"
  | "integrations.manage"
  | "settings.manage"
  | "admin_users.read"
  | "admin_users.manage";

export type AdminRole = "Owner" | "Admin" | "Staff";

export type AdminSessionUser = {
  userId: string;
  email: string;
  displayName: string;
  role: AdminRole;
  permissions: string[];
};

type AdminSessionValue = {
  loading: boolean;
  user: AdminSessionUser | null;
};

const AdminSessionContext = createContext<AdminSessionValue>({
  loading: true,
  user: null,
});

export function AdminSessionProvider({ children, loading, user }: AdminSessionValue & { children: React.ReactNode }) {
  return (
    <AdminSessionContext.Provider value={{ loading, user }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  return useContext(AdminSessionContext);
}

export function PermissionGate({
  children,
  fallback = null,
  permission,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  permission: AdminPermission;
}) {
  const { loading, user } = useAdminSession();

  if (loading || !hasPermission(user, permission)) return fallback;
  return <>{children}</>;
}

export function hasPermission(
  user: AdminSessionUser | null,
  permission: AdminPermission,
) {
  if (permission === "reviews.read" && user?.permissions.includes("reviews.manage")) {
    return true;
  }

  return Boolean(
    user?.permissions.includes("*") || user?.permissions.includes(permission),
  );
}

export function hasAnyPermission(
  user: AdminSessionUser | null,
  permissions: AdminPermission[],
) {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function canAccessAdminPath(
  user: AdminSessionUser | null,
  pathname: string,
) {
  const permissions = permissionsForPath(pathname);
  return permissions.length === 0 || hasAnyPermission(user, permissions);
}

export function firstAccessiblePath(user: AdminSessionUser | null) {
  const candidates: Array<[string, AdminPermission]> = [
    ["/", "dashboard.read"],
    ["/orders", "orders.read"],
    ["/products", "products.read"],
    ["/customers", "customers.read"],
    ["/reviews", "reviews.read"],
    ["/promotions", "marketing.manage"],
    ["/integrations/zort", "integrations.read"],
  ];

  return candidates.find(([, permission]) => hasPermission(user, permission))?.[0];
}

function permissionsForPath(pathname: string): AdminPermission[] {
  if (pathname === "/") return ["dashboard.read"];
  if (pathname.startsWith("/orders")) return ["orders.read"];
  if (/^\/products\/[^/]+\/edit/.test(pathname)) return ["products.manage"];
  if (pathname.startsWith("/products")) return ["products.read"];
  if (pathname.startsWith("/customers")) return ["customers.read"];
  if (pathname.startsWith("/reviews")) return ["reviews.read", "reviews.manage"];
  if (
    pathname.startsWith("/promotions") ||
    pathname.startsWith("/coupons") ||
    pathname.startsWith("/coupon-campaigns") ||
    pathname.startsWith("/flash-sale") ||
    pathname.startsWith("/home-slides")
  ) {
    return ["marketing.manage"];
  }
  if (pathname.startsWith("/integrations")) return ["integrations.read"];
  if (pathname.startsWith("/settings")) {
    return ["settings.manage", "integrations.read", "admin_users.read"];
  }
  return [];
}

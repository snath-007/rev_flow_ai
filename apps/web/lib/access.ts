import type { AuthenticatedActor, Capability } from "@revflow/shared";

export type NavigationItem = {
  href: string;
  label: string;
  capability: Capability;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export function hasCapability(actor: AuthenticatedActor, capability: Capability) {
  return actor.capabilities.includes(capability);
}

export function hasAnyCapability(actor: AuthenticatedActor, capabilities: Capability[]) {
  return capabilities.some((capability) => hasCapability(actor, capability));
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/overview", label: "Overview", capability: "workspace.read" }]
  },
  {
    label: "Configure",
    items: [
      { href: "/customers", label: "Customers", capability: "customers.read" },
      { href: "/catalog", label: "Catalog", capability: "catalog.read" },
      { href: "/contracts", label: "Contracts", capability: "contracts.read" },
      { href: "/ai", label: "AI intake", capability: "ai.read" }
    ]
  },
  {
    label: "Operate",
    items: [
      { href: "/usage", label: "Usage", capability: "usage.read" },
      { href: "/invoices", label: "Invoices", capability: "invoices.read" },
      { href: "/payments", label: "Payments", capability: "payments.read" }
    ]
  },
  {
    label: "Recognize",
    items: [{ href: "/revenue", label: "Revenue", capability: "revenue.read" }, { href: "/reports", label: "Reports", capability: "reports.read" }]
  },
  {
    label: "Control",
    items: [
      { href: "/audit", label: "Audit", capability: "audit.read" },
      { href: "/ops", label: "Operations", capability: "ops.read" }
    ]
  }
];

export const primaryNavigation = navigationGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, label: `Open ${item.label.toLowerCase()}` }))
);

export function navigationForActor(actor: AuthenticatedActor) {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasCapability(actor, item.capability))
    }))
    .filter((group) => group.items.length > 0);
}

export function flatNavigationForActor(actor: AuthenticatedActor) {
  return navigationForActor(actor).flatMap((group) => group.items);
}
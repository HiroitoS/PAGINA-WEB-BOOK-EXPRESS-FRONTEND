export const ADMIN_ROLE = "ADMINISTRADOR";
export const CATALOG_ROLE = "CATALOGO";
export const ATTENTION_ROLE = "ATENCION";
export const SALES_ADVISOR_ROLE = "ASESOR_COMERCIAL";
export const SALES_MANAGER_ROLE = "JEFE_COMERCIAL";
export const WAREHOUSE_ROLE = "ALMACEN";

export const DASHBOARD_ROLES = [
  ADMIN_ROLE,
  CATALOG_ROLE,
];

export const ADMIN_ONLY_ROLES = [
  ADMIN_ROLE,
];

export const CURRENT_PANEL_PERMISSIONS = [
  "catalog.view_catalog",
  "catalog.view_prices",
  "inquiries.view_inquiries",
  "workspaces.use_workspace",
  "crm.view_crm",
];

export function userHasRole(user, allowedRoles = []) {
  if (!user) return false;
  if (user.is_superuser) return true;

  const userRoles = Array.isArray(user.roles) ? user.roles : [];

  return allowedRoles.some((role) => userRoles.includes(role));
}

export function userHasPermission(user, requiredPermissions = []) {
  if (!user) return false;
  if (user.is_superuser) return true;

  const userPermissions = Array.isArray(user.permissions)
    ? user.permissions
    : [];

  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission),
  );
}

export function userCanEnterCurrentPanel(user) {
  if (!user) return false;
  if (user.is_superuser) return true;

  return userHasPermission(user, CURRENT_PANEL_PERMISSIONS);
}

export function getDefaultAdminPath(user) {
  if (!user) return "/admin/login";

  if (userHasRole(user, DASHBOARD_ROLES)) {
    return "/admin/dashboard";
  }

  if (
    userHasRole(user, [ATTENTION_ROLE])
    && userHasPermission(user, ["inquiries.view_inquiries"])
  ) {
    return "/admin/solicitudes";
  }

  if (
    userHasRole(user, [SALES_MANAGER_ROLE, SALES_ADVISOR_ROLE])
    && userHasPermission(user, ["crm.view_crm"])
  ) {
    return "/admin/crm";
  }

  if (userHasPermission(user, ["crm.view_crm"])) {
    return "/admin/crm";
  }

  if (userHasPermission(user, ["workspaces.use_workspace"])) {
    return "/admin/workspace";
  }

  if (userHasPermission(user, ["inquiries.view_inquiries"])) {
    return "/admin/solicitudes";
  }

  if (userHasPermission(user, ["catalog.view_catalog"])) {
    return "/admin/productos";
  }

  if (userHasPermission(user, ["catalog.view_prices"])) {
    return "/admin/precios";
  }

  return "/admin/sin-acceso";
}

export function getPrimaryRole(user) {
  if (user?.is_superuser) return "SUPERUSUARIO";

  const roles = Array.isArray(user?.roles) ? user.roles : [];

  const orderedRoles = [
    ADMIN_ROLE,
    SALES_MANAGER_ROLE,
    SALES_ADVISOR_ROLE,
    CATALOG_ROLE,
    ATTENTION_ROLE,
    WAREHOUSE_ROLE,
  ];

  return orderedRoles.find((role) => roles.includes(role))
    || roles[0]
    || "Sin rol";
}

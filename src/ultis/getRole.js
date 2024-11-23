export const ADMIN_ROLE = "ADMIN";
export const SUPPORT_ROLE = "SUPPORT";
export const CLINIC_ROLE = "CLINIC";

export const accessRole = (allowedRoles) => {
  const roles = ["ADMIN", "SUPPORT", "CLINIC", "USER"];
  return roles.filter((item) => allowedRoles.includes(item));
};

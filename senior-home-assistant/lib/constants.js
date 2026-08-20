// Canonical value lists for the string fields in prisma/schema.prisma.
// SQLite doesn't support native enums, so these are enforced here instead.

export const ROLES = {
  CLIENT: "CLIENT",
  FAMILY: "FAMILY",
  ADMIN: "ADMIN",
};

export const URGENCY = {
  WHENEVER: "WHENEVER",
  THIS_WEEK: "THIS_WEEK",
  URGENT: "URGENT",
};

export const URGENCY_LABELS = {
  WHENEVER: "Whenever (fits next route)",
  THIS_WEEK: "This week",
  URGENT: "Urgent (same/next day)",
};

// Order used for sorting the admin request queue, most urgent first.
export const URGENCY_ORDER = {
  URGENT: 0,
  THIS_WEEK: 1,
  WHENEVER: 2,
};

export const TASK_STATUS = {
  REQUESTED: "REQUESTED",
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
};

export const TASK_STATUS_LABELS = {
  REQUESTED: "Requested",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
};

export const VISIT_STATUS = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const INVITE_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
};

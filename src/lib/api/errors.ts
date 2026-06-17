export enum OperationType {
  GET = "GET",
  CREATE = "CREATE",
  WRITE = "WRITE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

/** Logs API errors in the same shape the old Firestore helper used. */
export function handleApiError(
  error: unknown,
  operation: OperationType,
  context: string,
): void {
  const errInfo = {
    operation,
    context,
    message: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  };
  console.error("API Error:", JSON.stringify(errInfo));
}

// UUID validation helper
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

export function validateUUIDParam(param: string | undefined, res: any): string | null {
  if (!param) {
    res.status(400).json({ error: "Missing required parameter" });
    return null;
  }
  if (!isValidUUID(param)) {
    res.status(400).json({ error: "Invalid UUID format" });
    return null;
  }
  return param;
}

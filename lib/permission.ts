export function requireOwner(role: string) {
  if (role !== "OWNER") {
    throw new Error("Akses khusus owner");
  }
}

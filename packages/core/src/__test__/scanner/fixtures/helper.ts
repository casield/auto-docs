// Fixture: helper file imported by entry.ts
export function formatUser(user: { id: string; name: string }) {
    return { ...user, formatted: true };
}

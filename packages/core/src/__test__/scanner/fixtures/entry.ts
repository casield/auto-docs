// Fixture: entry file that imports from a helper
import { formatUser } from "./helper";

export function getUser(event: any) {
    return formatUser({ id: "1", name: "Alice" });
}

import { revalidatePath } from "next/cache";

export function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // In standalone node/test environments, Next.js static generation store is not active.
    // Ignored gracefully to allow integration testing outside of HTTP requests.
  }
}

import { prisma } from "./db";
import { publish } from "./realtime";

export interface NotifyPayload {
  type: string;
  message: string;
  link?: string;
}

export async function notify(userIds: string | string[], payload: NotifyPayload) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (ids.length === 0) return;

  try {
    const records = ids.map((userId) => ({
      userId,
      type: payload.type,
      message: payload.message,
      link: payload.link || null,
    }));

    await prisma.notification.createMany({
      data: records,
    });

    // Publish to each user's realtime channel
    ids.forEach((userId) => {
      publish(`user:${userId}`, {
        kind: "notification",
        type: payload.type,
        message: payload.message,
        link: payload.link,
      });
    });
  } catch (err) {
    console.error("[Notify Error]:", err);
  }
}

import { eq, and, desc, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { staffTasks, appUsers } from "../../../db/schema";
import {
  formatWhatsAppPhone,
  sendWhatsAppTextMessage,
  sendTaskAcceptedAlertWhatsApp,
  sendTaskCompletedAlertWhatsApp,
} from "../../../lib/whatsapp";

const WEBHOOK_VERIFY_TOKEN = "joy_payroll_wa_webhook_secret_2026";

// Meta verification handshake
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Meta incoming event receiver
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    const fromPhone = formatWhatsAppPhone(String(message.from || ""));
    const buttonId = String(message.interactive?.button_reply?.id || message.button?.payload || "");
    const buttonTitle = String(
      message.interactive?.button_reply?.title || message.button?.text || "",
    ).trim().toLowerCase();
    const textBody = String(message.text?.body || "").trim().toLowerCase();

    const contextMsgId = String(message.context?.id || "");

    const isDoneSignal =
      buttonId.startsWith("task_complete_") ||
      buttonTitle.includes("done") ||
      buttonTitle.includes("complete") ||
      textBody.includes("done") ||
      textBody.includes("complete") ||
      textBody.includes("finish") ||
      textBody === "ok" ||
      textBody === "yes" ||
      textBody === "completed";

    const isAcceptSignal =
      buttonId.startsWith("task_accept_") ||
      buttonTitle.includes("accept") ||
      textBody === "accept" ||
      textBody.includes("accepted") ||
      textBody === "start" ||
      textBody.includes("started");

    const db = getDb();
    const explicitTaskId =
      buttonId.startsWith("task_complete_")
        ? buttonId.replace("task_complete_", "")
        : buttonId.startsWith("task_accept_")
          ? buttonId.replace("task_accept_", "")
          : null;

    let matchedTask = null;
    if (explicitTaskId) {
      const [t] = await db
        .select()
        .from(staffTasks)
        .where(eq(staffTasks.id, explicitTaskId))
        .limit(1);
      matchedTask = t;
    }

    if (!matchedTask && contextMsgId) {
      const [t] = await db
        .select()
        .from(staffTasks)
        .where(eq(staffTasks.whatsappMessageId, contextMsgId))
        .limit(1);
      matchedTask = t;
    }

    if (!matchedTask) {
      const activeTasks = await db
        .select()
        .from(staffTasks)
        .where(
          and(
            inArray(staffTasks.status, ["pending", "in_progress"]),
          ),
        )
        .orderBy(desc(staffTasks.createdAt));

      matchedTask = activeTasks.find(
        (t) => formatWhatsAppPhone(t.assignedToPhone) === fromPhone,
      );
    }

    if (matchedTask) {
      const now = new Date().toISOString();
      const displayTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

      const superAdmins = await db
        .select()
        .from(appUsers)
        .where(eq(appUsers.role, "super_admin"));
      const adminPhone = superAdmins.find((a) => a.mobileNumber)?.mobileNumber || "919944399088";

      if (isDoneSignal) {
        // Update task to completed
        await db
          .update(staffTasks)
          .set({
            status: "completed",
            completedAt: now,
            completionNotes: `Reported via WhatsApp: "${message.text?.body || buttonTitle || "Completed"}"`,
            updatedAt: now,
          })
          .where(eq(staffTasks.id, matchedTask.id));

        // 1. Reply to staff
        await sendWhatsAppTextMessage(
          fromPhone,
          `✅ *Task Marked Complete!*\n\nThank you, *${matchedTask.assignedToName}*. Task "*${matchedTask.title}*" has been recorded as completed in Joy HRMS.`,
        );

        // 2. Alert Super Admin
        await sendTaskCompletedAlertWhatsApp(adminPhone, {
          title: matchedTask.title,
          assignedToName: matchedTask.assignedToName,
          completedAt: displayTime,
          completionNotes: `Reported via WhatsApp from +${fromPhone}`,
        });
      } else if (isAcceptSignal) {
        // Update task to in_progress / accepted
        await db
          .update(staffTasks)
          .set({
            status: "in_progress",
            acceptedAt: now,
            updatedAt: now,
          })
          .where(eq(staffTasks.id, matchedTask.id));

        // 1. Reply to staff
        await sendWhatsAppTextMessage(
          fromPhone,
          `👍 *Task Accepted!*\n\nThank you, *${matchedTask.assignedToName}*. We have notified the Super Admin that you have seen and started working on *${matchedTask.title}*.\n\nTap *✅ Task Completed* when you are finished!`,
        );

        // 2. Alert Super Admin
        await sendTaskAcceptedAlertWhatsApp(adminPhone, {
          title: matchedTask.title,
          assignedToName: matchedTask.assignedToName,
          acceptedAt: displayTime,
        });
      }
    } else if (isAcceptSignal || isDoneSignal) {
      await sendWhatsAppTextMessage(
        fromPhone,
        `ℹ️ *Joy HRMS Notification*\n\nNo pending tasks currently assigned to your number (+${fromPhone}). Contact Super Admin if you need assistance.`,
      );
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}

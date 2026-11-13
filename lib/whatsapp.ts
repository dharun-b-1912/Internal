export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
}

const DEFAULT_PHONE_NUMBER_ID = "1320562981133693";
const DEFAULT_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN ||
  "EAAr6ubzWUqgBSkbHTSH8qVAqqE9Y241IGKL4RXS5ZAILEXPjs3gGvvHK3tYy3AAD2qPPwrcf8EDnK5MS2ToyhDmqg26Hu8eHunqMI6XThTIupiZAJZCLH22GlQujC3ZBUiRJYsWxX8sQIomyavnNTLoHh53ejtPC3AZCRhnQGDv0999724ZCyoprjCI42e11cvUBKIlyU88VpNXqGQq1h6sae80er9ZBx18vkpoZAul0Q9B78qIiZC23gHsVAKBhZCGGsW7NWJ6D3EvDF3gU59mWpH9rp67AZDZD";

export function formatWhatsAppPhone(phone: string): string {
  // Strip spaces, dashes, parentheses, +
  const cleaned = phone.replace(/[^0-9]/g, "");
  // If 10 digits (India), prefix with 91
  if (cleaned.length === 10) return `91${cleaned}`;
  // If starts with 0 and 11 digits, strip leading 0 and add 91
  if (cleaned.length === 11 && cleaned.startsWith("0")) return `91${cleaned.slice(1)}`;
  return cleaned;
}

export async function sendWhatsAppTextMessage(
  toPhone: string,
  text: string,
  config?: Partial<WhatsAppConfig>,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneId = config?.phoneNumberId || DEFAULT_PHONE_NUMBER_ID;
  const token = config?.accessToken || DEFAULT_ACCESS_TOKEN;
  const formattedTo = formatWhatsAppPhone(toPhone);

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "text",
        text: {
          body: text,
        },
      }),
    });

    const data = (await res.json()) as any;
    if (data.messages && data.messages[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    const errMsg = data.error?.message || "Failed to deliver WhatsApp message";
    return { success: false, error: errMsg };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error sending WhatsApp message" };
  }
}

export async function sendWhatsAppInteractiveButtons(
  toPhone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  config?: Partial<WhatsAppConfig>,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneId = config?.phoneNumberId || DEFAULT_PHONE_NUMBER_ID;
  const token = config?.accessToken || DEFAULT_ACCESS_TOKEN;
  const formattedTo = formatWhatsAppPhone(toPhone);

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: bodyText,
          },
          action: {
            buttons: buttons.slice(0, 3).map((btn) => ({
              type: "reply",
              reply: {
                id: btn.id.slice(0, 256),
                title: btn.title.slice(0, 20),
              },
            })),
          },
        },
      }),
    });

    const data = (await res.json()) as any;
    if (data.messages && data.messages[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    // Fall back to standard text message if interactive buttons fails
    return sendWhatsAppTextMessage(toPhone, bodyText, config);
  } catch (err: any) {
    return sendWhatsAppTextMessage(toPhone, bodyText, config);
  }
}

export async function sendTaskAssignmentWhatsApp(
  task: {
    id: string;
    title: string;
    description?: string | null;
    assignedToName: string;
    assignedToPhone: string;
    dueDate?: string | null;
    priority?: string;
    createdBy: string;
    isReminder?: boolean;
    reminderNumber?: number;
  },
  config?: Partial<WhatsAppConfig>,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const priorityBadge = task.priority === "urgent" ? "🚨 URGENT" : task.priority === "high" ? "⚡ HIGH" : "📌 NORMAL";
  const due = task.dueDate ? `📅 *Due Date:* ${task.dueDate}\n` : "";
  const desc = task.description ? `📝 *Details:* ${task.description}\n` : "";
  const header = task.isReminder
    ? `⏰ *Joy HRMS - Task Reminder #${task.reminderNumber || 1}*`
    : `🔔 *Joy HRMS - New Task Assigned*`;

  const text =
    `${header}\n\n` +
    `Hello *${task.assignedToName}*,\n` +
    `${task.isReminder ? "This is a reminder for your assigned task:" : "A new task has been assigned to you:"}\n\n` +
    `📌 *Task:* ${task.title}\n` +
    `${desc}` +
    `⚡ *Priority:* ${priorityBadge}\n` +
    `${due}` +
    `👤 *Assigned By:* ${task.createdBy}\n\n` +
    `Please tap an action button below:`;

  return sendWhatsAppInteractiveButtons(
    task.assignedToPhone,
    text,
    [
      { id: `task_accept_${task.id}`, title: "👍 Accept Task" },
      { id: `task_complete_${task.id}`, title: "✅ Task Completed" },
    ],
    config,
  );
}

export async function sendTaskAcceptedAlertWhatsApp(
  adminPhone: string,
  task: {
    title: string;
    assignedToName: string;
    acceptedAt: string;
  },
  config?: Partial<WhatsAppConfig>,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const text =
    `👀 *Joy HRMS - Task Accepted Alert*\n\n` +
    `📌 *Task:* ${task.title}\n` +
    `👤 *Accepted By:* ${task.assignedToName}\n` +
    `⏰ *Accepted At:* ${task.acceptedAt}\n\n` +
    `Staff has viewed the task and confirmed they are working on it.`;

  return sendWhatsAppTextMessage(adminPhone, text, config);
}

export async function sendWhatsAppDocumentMessage(
  toPhone: string,
  documentUrl: string,
  filename: string,
  caption?: string,
  config?: Partial<WhatsAppConfig>,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneId = config?.phoneNumberId || DEFAULT_PHONE_NUMBER_ID;
  const token = config?.accessToken || DEFAULT_ACCESS_TOKEN;
  const formattedTo = formatWhatsAppPhone(toPhone);

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "document",
        document: {
          link: documentUrl,
          filename: filename,
          ...(caption ? { caption } : {}),
        },
      }),
    });

    const data = (await res.json()) as any;
    if (data.messages && data.messages[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    const errMsg = data.error?.message || "Failed to deliver WhatsApp document";
    return { success: false, error: errMsg };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error sending WhatsApp document" };
  }
}

export async function sendTaskCompletedAlertWhatsApp(
  adminPhone: string,
  task: {
    title: string;
    assignedToName: string;
    completedAt: string;
    completionNotes?: string | null;
  },
  config?: Partial<WhatsAppConfig>,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const notes = task.completionNotes ? `📝 *Notes:* ${task.completionNotes}\n` : "";
  const text =
    `✅ *Joy HRMS - Task Completed Alert*\n\n` +
    `📌 *Task:* ${task.title}\n` +
    `👤 *Completed By:* ${task.assignedToName}\n` +
    `⏰ *Completed At:* ${task.completedAt}\n` +
    `${notes}\n` +
    `Task has been automatically marked as COMPLETED in the portal.`;

  return sendWhatsAppTextMessage(adminPhone, text, config);
}

export async function uploadWhatsAppMedia(
  fileBytes: Uint8Array | ArrayBuffer,
  filename: string,
  mimeType = "application/pdf",
  config?: Partial<WhatsAppConfig>,
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const phoneId = config?.phoneNumberId || DEFAULT_PHONE_NUMBER_ID;
  const token = config?.accessToken || DEFAULT_ACCESS_TOKEN;

  try {
    const blob = new Blob([fileBytes as any], { type: mimeType });
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", mimeType);
    formData.append("file", blob, filename);

    const url = `https://graph.facebook.com/v21.0/${phoneId}/media`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = (await res.json()) as any;
    if (data.id) {
      return { success: true, mediaId: data.id };
    }
    const errMsg = data.error?.message || "Failed to upload media to WhatsApp Cloud API";
    return { success: false, error: errMsg };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error uploading media to WhatsApp" };
  }
}

export async function sendWhatsAppDocumentByMediaId(
  toPhone: string,
  mediaId: string,
  filename: string,
  caption?: string,
  config?: Partial<WhatsAppConfig>,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneId = config?.phoneNumberId || DEFAULT_PHONE_NUMBER_ID;
  const token = config?.accessToken || DEFAULT_ACCESS_TOKEN;
  const formattedTo = formatWhatsAppPhone(toPhone);

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "document",
        document: {
          id: mediaId,
          filename,
          ...(caption ? { caption } : {}),
        },
      }),
    });

    const data = (await res.json()) as any;
    if (data.messages && data.messages[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    const errMsg = data.error?.message || "Failed to send WhatsApp document message";
    return { success: false, error: errMsg };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error sending WhatsApp document" };
  }
}

export function formatDailyReportWhatsAppText({
  dateFormatted,
  totalJoined,
  totalLeft,
  netDelta,
  companySummaries,
}: {
  dateFormatted: string;
  totalJoined: number;
  totalLeft: number;
  netDelta: number;
  companySummaries: Array<{
    clientName: string;
    unitName: string;
    jCount: number;
    lCount: number;
    net: number;
  }>;
}): string {
  const netSign = netDelta > 0 ? `+${netDelta}` : String(netDelta);
  const netEmoji = netDelta >= 0 ? "🟢" : "🔴";

  let msg = `📊 *JOY CORPORATE SOLUTIONS - DAILY WORKFORCE REPORT*\n`;
  msg += `📅 *Date:* ${dateFormatted}\n\n`;
  msg += `*EXECUTIVE SUMMARY*\n`;
  msg += `• *Total Joined Today:* ${totalJoined}\n`;
  msg += `• *Total Left Today:* ${totalLeft}\n`;
  msg += `• *Net Movement:* ${netEmoji} *${netSign}*\n\n`;

  if (companySummaries.length > 0) {
    msg += `🏢 *COMPANY-WISE MOVEMENTS*\n`;
    for (const c of companySummaries) {
      const cSign = c.net > 0 ? `+${c.net}` : String(c.net);
      msg += `• *${c.clientName} (${c.unitName})*: ${c.jCount} Joined | ${c.lCount} Left (${cSign})\n`;
    }
  } else {
    msg += `ℹ️ _No employee movements recorded on this date._\n`;
  }

  msg += `\n📎 _Official company-wise PDF report attached._`;
  return msg;
}

export async function sendDailyWorkforceReportWhatsApp({
  toPhone,
  pdfBytes,
  filename,
  caption,
  config,
}: {
  toPhone: string;
  pdfBytes: Uint8Array | ArrayBuffer;
  filename: string;
  caption: string;
  config?: Partial<WhatsAppConfig>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // 1. Upload media directly to Meta
  const uploadResult = await uploadWhatsAppMedia(pdfBytes, filename, "application/pdf", config);
  if (!uploadResult.success || !uploadResult.mediaId) {
    return {
      success: false,
      error: uploadResult.error || "Failed to upload PDF report to Meta WhatsApp",
    };
  }

  // 2. Dispatch document message
  return sendWhatsAppDocumentByMediaId(toPhone, uploadResult.mediaId, filename, caption, config);
}


import type { GoogleWorkspaceService } from "@paperclipai/shared";

export interface GoogleWorkspaceRestFallbackInput {
  service: GoogleWorkspaceService;
  leaf: string;
  parameters: unknown;
  authorization: string;
  signal: AbortSignal;
  dispatchRemote: (url: string, init: RequestInit) => Promise<Response>;
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeIsoTimestamp(value: string, allDay?: boolean): { date?: string; dateTime?: string } {
  if (allDay || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { date: value.slice(0, 10) };
  }
  // If no timezone offset or trailing Z is provided, append local offset or Z
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return { dateTime: parsed.toISOString() };
    }
  }
  return { dateTime: value };
}

function buildDriveSearchQuery(rawQuery: string | undefined): string {
  if (!rawQuery) return "trashed = false";
  const hasOperators = /\b(contains|mimeType|trashed|starred|parents|name|fullText|modifiedTime)\b|[=<>]/i.test(rawQuery);
  if (hasOperators) return rawQuery;
  const escaped = rawQuery.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `trashed = false and (name contains '${escaped}' or fullText contains '${escaped}')`;
}

function mapGmailFormat(format: string | undefined): string {
  switch (format) {
    case "MINIMAL":
      return "minimal";
    case "METADATA_ONLY":
      return "metadata";
    case "RAW":
      return "raw";
    default:
      return "full";
  }
}

export function isGoogleWorkspacePreviewPermissionError(text: string): boolean {
  return /caller does not have permission|Developer Preview|developers\.google\.com\/workspace\/preview/i.test(text);
}

export async function executeGoogleWorkspaceRestFallback(
  input: GoogleWorkspaceRestFallbackInput,
): Promise<{ content: Array<{ type: "text"; text: string }>; structuredContent: unknown; isError: boolean }> {
  const { service, leaf, authorization, signal, dispatchRemote } = input;
  const params = asObj(input.parameters);

  const requestJson = async (url: string, init: RequestInit = {}): Promise<unknown> => {
    const headers: Record<string, string> = {
      Authorization: authorization,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    };
    const res = await dispatchRemote(url, {
      ...init,
      headers,
      signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Google REST API (${res.status}): ${text.slice(0, 1000)}`);
    }
    if (!text) return { ok: true };
    try {
      return JSON.parse(text);
    } catch {
      return { content: text };
    }
  };

  const requestText = async (url: string, init: RequestInit = {}): Promise<string> => {
    const headers: Record<string, string> = {
      Authorization: authorization,
      ...((init.headers as Record<string, string>) ?? {}),
    };
    const res = await dispatchRemote(url, {
      ...init,
      headers,
      signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Google REST API (${res.status}): ${text.slice(0, 1000)}`);
    }
    return text;
  };

  let data: unknown;

  switch (service) {
    case "gmail": {
      const base = "https://gmail.googleapis.com/gmail/v1/users/me";
      if (leaf === "list_labels") {
        data = await requestJson(`${base}/labels`);
      } else if (leaf === "search_threads" || leaf === "list_threads") {
        const qs = new URLSearchParams();
        if (str(params.query)) qs.set("q", str(params.query)!);
        if (num(params.pageSize)) qs.set("maxResults", String(num(params.pageSize)));
        if (str(params.pageToken)) qs.set("pageToken", str(params.pageToken)!);
        if (bool(params.includeTrash) !== undefined) qs.set("includeSpamTrash", String(bool(params.includeTrash)));
        data = await requestJson(`${base}/threads?${qs.toString()}`);
      } else if (leaf === "search_messages") {
        const qs = new URLSearchParams();
        if (str(params.query)) qs.set("q", str(params.query)!);
        if (num(params.pageSize)) qs.set("maxResults", String(num(params.pageSize)));
        if (str(params.pageToken)) qs.set("pageToken", str(params.pageToken)!);
        if (bool(params.includeTrash) !== undefined) qs.set("includeSpamTrash", String(bool(params.includeTrash)));
        data = await requestJson(`${base}/messages?${qs.toString()}`);
      } else if (leaf === "get_thread") {
        const threadId = str(params.threadId) ?? "";
        const format = mapGmailFormat(str(params.messageFormat));
        data = await requestJson(`${base}/threads/${encodeURIComponent(threadId)}?format=${format}`);
      } else if (leaf === "get_message") {
        const messageId = str(params.messageId) ?? "";
        const format = mapGmailFormat(str(params.messageFormat));
        data = await requestJson(`${base}/messages/${encodeURIComponent(messageId)}?format=${format}`);
      } else if (leaf === "list_drafts") {
        const qs = new URLSearchParams();
        if (str(params.query)) qs.set("q", str(params.query)!);
        if (num(params.pageSize)) qs.set("maxResults", String(num(params.pageSize)));
        if (str(params.pageToken)) qs.set("pageToken", str(params.pageToken)!);
        data = await requestJson(`${base}/drafts?${qs.toString()}`);
      } else if (leaf === "get_draft") {
        const draftId = str(params.draftId) ?? "";
        const format = mapGmailFormat(str(params.messageFormat));
        data = await requestJson(`${base}/drafts/${encodeURIComponent(draftId)}?format=${format}`);
      } else if (leaf === "create_draft") {
        const to = Array.isArray(params.to) ? params.to.join(", ") : str(params.to) ?? "";
        const cc = Array.isArray(params.cc) ? params.cc.join(", ") : str(params.cc);
        const bcc = Array.isArray(params.bcc) ? params.bcc.join(", ") : str(params.bcc);
        const subject = str(params.subject) ?? "";
        const htmlBody = str(params.htmlBody);
        const textBody = str(params.body) ?? "";
        const lines: string[] = [];
        if (to) lines.push(`To: ${to}`);
        if (cc) lines.push(`Cc: ${cc}`);
        if (bcc) lines.push(`Bcc: ${bcc}`);
        if (subject) lines.push(`Subject: ${subject}`);
        lines.push("MIME-Version: 1.0");
        lines.push(
          htmlBody
            ? 'Content-Type: text/html; charset="UTF-8"'
            : 'Content-Type: text/plain; charset="UTF-8"',
        );
        lines.push("");
        lines.push(htmlBody ?? textBody);
        const raw = Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
        data = await requestJson(`${base}/drafts`, {
          method: "POST",
          body: JSON.stringify({ message: { raw } }),
        });
      } else {
        throw new Error(`Unsupported Gmail action: ${leaf}`);
      }
      break;
    }

    case "drive": {
      const base = "https://www.googleapis.com/drive/v3";
      if (leaf === "search_files") {
        const rawQuery = str(params.query);
        const runSearch = async (q: string) => {
          const qs = new URLSearchParams({
            q,
            pageSize: String(num(params.pageSize) ?? 25),
            supportsAllDrives: "true",
            includeItemsFromAllDrives: "true",
            fields: "nextPageToken,files(id,name,mimeType,modifiedTime,createdTime,size,webViewLink,owners,parents,description)",
          });
          if (str(params.pageToken)) qs.set("pageToken", str(params.pageToken)!);
          return requestJson(`${base}/files?${qs.toString()}`);
        };
        try {
          data = await runSearch(buildDriveSearchQuery(rawQuery));
        } catch {
          const escaped = (rawQuery ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
          data = await runSearch(`trashed = false and (name contains '${escaped}' or fullText contains '${escaped}')`);
        }
      } else if (leaf === "list_recent_files") {
        const qs = new URLSearchParams({
          q: "trashed = false",
          orderBy: str(params.orderBy) ?? "modifiedTime desc",
          pageSize: String(num(params.pageSize) ?? 25),
          supportsAllDrives: "true",
          includeItemsFromAllDrives: "true",
          fields: "nextPageToken,files(id,name,mimeType,modifiedTime,createdTime,size,webViewLink,owners,parents,description)",
        });
        if (str(params.pageToken)) qs.set("pageToken", str(params.pageToken)!);
        data = await requestJson(`${base}/files?${qs.toString()}`);
      } else if (leaf === "get_file_metadata") {
        const fileId = str(params.fileId) ?? "";
        data = await requestJson(
          `${base}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,mimeType,modifiedTime,createdTime,size,webViewLink,owners,parents,description,capabilities`,
        );
      } else if (leaf === "get_file_permissions") {
        const fileId = str(params.fileId) ?? "";
        data = await requestJson(
          `${base}/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&fields=*`,
        );
      } else if (leaf === "read_file_content" || leaf === "download_file_content") {
        const fileId = str(params.fileId) ?? "";
        const meta = asObj(
          await requestJson(
            `${base}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,mimeType,webViewLink`,
          ),
        );
        const mimeType = str(meta.mimeType) ?? "";
        const exportMime =
          str(params.exportMimeType) ??
          (mimeType === "application/vnd.google-apps.document"
            ? "text/plain"
            : mimeType === "application/vnd.google-apps.spreadsheet"
              ? "text/csv"
              : mimeType === "application/vnd.google-apps.presentation"
                ? "text/plain"
                : null);
        const content = exportMime
          ? await requestText(
              `${base}/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMime)}`,
            )
          : await requestText(`${base}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
        data = { ...meta, content };
      } else if (leaf === "copy_file") {
        const fileId = str(params.fileId) ?? "";
        const body: Record<string, unknown> = {};
        if (str(params.title)) body.name = str(params.title);
        if (str(params.parentId)) body.parents = [str(params.parentId)];
        data = await requestJson(`${base}/files/${encodeURIComponent(fileId)}/copy?supportsAllDrives=true`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else if (leaf === "create_file") {
        const name = str(params.title) ?? "Untitled";
        const mimeType = str(params.mimeType);
        const parentId = str(params.parentId);
        const textContent = str(params.textContent) ?? str(params.content);
        const base64Content = str(params.base64Content);
        const metadata: Record<string, unknown> = { name };
        if (mimeType) metadata.mimeType = mimeType;
        if (parentId) metadata.parents = [parentId];
        if (textContent !== undefined || base64Content !== undefined) {
          const boundary = `paperclip_drive_${Date.now()}`;
          const contentMime = str(params.contentMimeType) ?? "text/plain; charset=UTF-8";
          const filePayload = base64Content
            ? Buffer.from(base64Content, "base64").toString("utf8")
            : (textContent ?? "");
          const multipartBody = [
            `--${boundary}`,
            "Content-Type: application/json; charset=UTF-8",
            "",
            JSON.stringify(metadata),
            `--${boundary}`,
            `Content-Type: ${contentMime}`,
            "",
            filePayload,
            `--${boundary}--`,
          ].join("\r\n");
          data = await requestJson(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
            {
              method: "POST",
              headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
              body: multipartBody,
            },
          );
        } else {
          data = await requestJson(`${base}/files?supportsAllDrives=true`, {
            method: "POST",
            body: JSON.stringify(metadata),
          });
        }
      } else {
        throw new Error(`Unsupported Drive action: ${leaf}`);
      }
      break;
    }

    case "docs": {
      const base = "https://docs.googleapis.com/v1/documents";
      const documentId = str(params.documentId) ?? "";
      if (leaf === "read_doc") {
        data = await requestJson(`${base}/${encodeURIComponent(documentId)}`);
      } else if (leaf === "update_doc") {
        const body: Record<string, unknown> = {
          requests: Array.isArray(params.requests) ? params.requests : [],
        };
        if (params.writeControl) body.writeControl = params.writeControl;
        data = await requestJson(`${base}/${encodeURIComponent(documentId)}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else {
        throw new Error(`Unsupported Docs action: ${leaf}`);
      }
      break;
    }

    case "sheets": {
      const base = "https://sheets.googleapis.com/v4/spreadsheets";
      const spreadsheetId = str(params.spreadsheetId) ?? "";
      if (leaf === "get_spreadsheet") {
        const qs = new URLSearchParams();
        if (bool(params.includeGridData) !== undefined) {
          qs.set("includeGridData", String(bool(params.includeGridData)));
        }
        if (Array.isArray(params.ranges)) {
          for (const r of params.ranges) {
            if (typeof r === "string") qs.append("ranges", r);
          }
        }
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        data = await requestJson(`${base}/${encodeURIComponent(spreadsheetId)}${suffix}`);
      } else if (leaf === "get_values") {
        const range = str(params.range) ?? "A1:Z100";
        data = await requestJson(
          `${base}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
        );
      } else if (leaf === "update_values" || leaf === "update_formulas") {
        const range = str(params.range) ?? "A1";
        const values = Array.isArray(params.values)
          ? params.values
          : Array.isArray(params.formulas)
            ? params.formulas
            : [];
        data = await requestJson(
          `${base}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
          {
            method: "PUT",
            body: JSON.stringify({ range, values }),
          },
        );
      } else if (leaf === "update_spreadsheet") {
        const body: Record<string, unknown> = {
          requests: Array.isArray(params.requests) ? params.requests : [],
        };
        if (params.writeControl) body.writeControl = params.writeControl;
        data = await requestJson(`${base}/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else if (leaf === "insert_dimension") {
        data = await requestJson(`${base}/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify({
            requests: [
              {
                insertDimension: {
                  range: {
                    sheetId: num(params.sheetId) ?? 0,
                    dimension: str(params.dimension) ?? "ROWS",
                    startIndex: num(params.startIndex) ?? 0,
                    endIndex: num(params.endIndex) ?? 1,
                  },
                  inheritFromBefore: bool(params.inheritFromBefore) ?? false,
                },
              },
            ],
          }),
        });
      } else {
        throw new Error(`Unsupported Sheets action: ${leaf}`);
      }
      break;
    }

    case "slides": {
      const base = "https://slides.googleapis.com/v1/presentations";
      const presentationId = str(params.presentationId) ?? "";
      if (leaf === "read_presentation") {
        data = await requestJson(`${base}/${encodeURIComponent(presentationId)}`);
      } else if (leaf === "update_presentation") {
        const body: Record<string, unknown> = {
          requests: Array.isArray(params.requests) ? params.requests : [],
        };
        if (params.writeControl) body.writeControl = params.writeControl;
        data = await requestJson(`${base}/${encodeURIComponent(presentationId)}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else {
        throw new Error(`Unsupported Slides action: ${leaf}`);
      }
      break;
    }

    case "calendar": {
      const base = "https://www.googleapis.com/calendar/v3";
      const calendarId = str(params.calendarId) ?? "primary";
      if (leaf === "list_calendars") {
        const qs = new URLSearchParams();
        if (num(params.pageSize)) qs.set("maxResults", String(num(params.pageSize)));
        if (str(params.pageToken)) qs.set("pageToken", str(params.pageToken)!);
        data = await requestJson(`${base}/users/me/calendarList?${qs.toString()}`);
      } else if (leaf === "list_events" || leaf === "search_events") {
        const qs = new URLSearchParams({ singleEvents: "true" });
        const q = str(params.query) ?? str(params.fullText);
        if (q) qs.set("q", q);
        if (str(params.startTime)) {
          const norm = normalizeIsoTimestamp(str(params.startTime)!);
          if (norm.dateTime) qs.set("timeMin", norm.dateTime);
        }
        if (str(params.endTime)) {
          const norm = normalizeIsoTimestamp(str(params.endTime)!);
          if (norm.dateTime) qs.set("timeMax", norm.dateTime);
        }
        if (num(params.pageSize)) qs.set("maxResults", String(num(params.pageSize)));
        if (str(params.pageToken)) qs.set("pageToken", str(params.pageToken)!);
        if (str(params.timeZone)) qs.set("timeZone", str(params.timeZone)!);
        data = await requestJson(
          `${base}/calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`,
        );
      } else if (leaf === "get_event") {
        const eventId = str(params.eventId) ?? "";
        data = await requestJson(
          `${base}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        );
      } else if (leaf === "create_event") {
        const allDay = bool(params.allDay) ?? false;
        const timeZone = str(params.timeZone);
        const startObj: Record<string, unknown> = {
          ...normalizeIsoTimestamp(str(params.startTime) ?? new Date().toISOString(), allDay),
          ...(timeZone ? { timeZone } : {}),
        };
        const endObj: Record<string, unknown> = {
          ...normalizeIsoTimestamp(str(params.endTime) ?? new Date(Date.now() + 3600_000).toISOString(), allDay),
          ...(timeZone ? { timeZone } : {}),
        };
        const attendees = [
          ...(Array.isArray(params.attendees) ? params.attendees : []),
          ...(Array.isArray(params.attendeeEmails)
            ? params.attendeeEmails.filter((e): e is string => typeof e === "string").map((email) => ({ email }))
            : []),
        ];
        const body: Record<string, unknown> = {
          summary: str(params.summary) ?? "",
          start: startObj,
          end: endObj,
        };
        if (str(params.description)) body.description = str(params.description);
        if (str(params.location)) body.location = str(params.location);
        if (attendees.length > 0) body.attendees = attendees;
        data = await requestJson(`${base}/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else if (leaf === "update_event") {
        const eventId = str(params.eventId) ?? "";
        const allDay = bool(params.allDay);
        const timeZone = str(params.timeZone);
        const body: Record<string, unknown> = {};
        if (str(params.summary) !== undefined) body.summary = str(params.summary);
        if (str(params.description) !== undefined) body.description = str(params.description);
        if (str(params.location) !== undefined) body.location = str(params.location);
        if (str(params.startTime)) {
          body.start = {
            ...normalizeIsoTimestamp(str(params.startTime)!, allDay),
            ...(timeZone ? { timeZone } : {}),
          };
        }
        if (str(params.endTime)) {
          body.end = {
            ...normalizeIsoTimestamp(str(params.endTime)!, allDay),
            ...(timeZone ? { timeZone } : {}),
          };
        }
        data = await requestJson(
          `${base}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          },
        );
      } else if (leaf === "delete_event") {
        const eventId = str(params.eventId) ?? "";
        await requestText(
          `${base}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          { method: "DELETE" },
        );
        data = { deleted: true, eventId };
      } else if (leaf === "suggest_time") {
        const items = Array.isArray(params.attendeeEmails)
          ? params.attendeeEmails.filter((e): e is string => typeof e === "string").map((id) => ({ id }))
          : [{ id: "primary" }];
        const startNorm = normalizeIsoTimestamp(str(params.startTime) ?? new Date().toISOString());
        const endNorm = normalizeIsoTimestamp(str(params.endTime) ?? new Date(Date.now() + 86400_000).toISOString());
        data = await requestJson(`${base}/freeBusy`, {
          method: "POST",
          body: JSON.stringify({
            timeMin: startNorm.dateTime,
            timeMax: endNorm.dateTime,
            ...(str(params.timeZone) ? { timeZone: str(params.timeZone) } : {}),
            items,
          }),
        });
      } else {
        throw new Error(`Unsupported Calendar action: ${leaf}`);
      }
      break;
    }

    default:
      throw new Error(`Unsupported Google Workspace service: ${service}`);
  }

  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: false,
  };
}

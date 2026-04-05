// src/utils/ics.js

export function extractICS(text) {
  const start = text.indexOf("BEGIN:VCALENDAR");
  const end = text.indexOf("END:VCALENDAR");

  if (start !== -1 && end !== -1) {
    return text.substring(start, end + "END:VCALENDAR".length);
  }

  return text;
}

export function downloadICS(icsContent) {
  const blob = new Blob([icsContent], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "items.ics";
  a.click();

  URL.revokeObjectURL(url);
}

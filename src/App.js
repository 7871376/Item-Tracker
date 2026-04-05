import { useState } from "react";

export default function App() {
  let apiKey = null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const currentYear = new Date().getFullYear();

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { name: "", last_purchase: "", days_supply: "", cost: "" },
    ]);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleCollapse = (index) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const isComplete = (item) => {
    return item.name && item.last_purchase && item.days_supply && item.cost;
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // ?? NEW: collapse only after blur + valid
  const handleBlur = (index) => {
    const item = items[index];

    if (isComplete(item)) {
      setCollapsed((prev) => ({ ...prev, [index]: true }));
    }
  };

  const handleDateBlur = (index, value) => {
    if (!value) return;

    let updatedValue = value;

    if (/^\d{1,2}-\d{1,2}$/.test(value)) {
      const [month, day] = value.split("-");
      updatedValue = `${currentYear}-${month.padStart(2, "0")}-${day.padStart(
        2,
        "0"
      )}`;
      updateItem(index, "last_purchase", updatedValue);
    }

    // run collapse check AFTER date normalization
    const updated = {
      ...items[index],
      last_purchase: updatedValue,
    };

    if (isComplete(updated)) {
      setCollapsed((prev) => ({ ...prev, [index]: true }));
    }
  };

  // ?? Calculate next refill date
  const getRunOutDate = (item) => {
    if (!item.last_purchase || !item.days_supply) return null;

    const start = new Date(item.last_purchase);
    if (isNaN(start)) return null;

    const result = new Date(start);
    result.setDate(result.getDate() + Number(item.days_supply));

    return result.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  function extractICS(text) {
    const start = text.indexOf("BEGIN:VCALENDAR");
    const end = text.indexOf("END:VCALENDAR");

    if (start !== -1 && end !== -1) {
      return text.substring(start, end + "END:VCALENDAR".length);
    }

    return text;
  }

  function downloadICS(icsContent) {
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "items.ics";
    a.click();

    URL.revokeObjectURL(url);
  }

  const generateICS = async () => {
    // Ask for API key once per session
    if (!apiKey) {
      apiKey = window.prompt("Enter your OpenAI API key:");
      if (!apiKey) return;
    }

    setLoading(true);

    const payload = { medications: items };

    const promptText = `You are generating a calendar (.ics file).

INPUT DATA:
${JSON.stringify(payload, null, 2)}

REQUIREMENTS:
- For each medication, calculate ONLY the NEXT refill date
  - Refill date = last_purchase + days_supply
  - Do NOT generate recurring or future refill cycles
  - Only include the single next upcoming run-out date per medication

- Create ONE event per medication using that next refill date

- Add an alert 5 days before the refill date

- Include run-out date in title and description

- ALSO create weekly summary events:
  - ONLY include weeks that contain at least one refill event
  - Do NOT generate empty weeks
  - Include total cost for that week
  - Include list of medications for that week
  
  OUTPUT:
  Return ONLY valid .ics file content.
  
  IMPORTANT:
  - Do NOT project beyond the next refill date
  - Do NOT create multiple refill events for the same medication
  - Each medication must appear exactly once in the output`;

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: promptText,
        }),
      });

      // ?? ADD THIS
      console.log("STATUS:", response.status);

      const text = await response.text();
      console.log("RAW RESPONSE:", text);

      // Parse JSON
      const data = JSON.parse(text);

      // ? Extract ICS (this is the correct path based on your output)
      const rawText = data.output?.[0]?.content?.[0]?.text || data.output_text;

      if (!rawText) {
        console.error("FULL RESPONSE:", data);
        alert("No ICS content returned");
        return;
      }

      // Optional cleanup (safe)
      const icsContent = extractICS(rawText);

      // Download
      downloadICS(icsContent);
    } catch (err) {
      console.error(err);
      alert("Error generating calendar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
      <div className="max-w-md mx-auto p-4 pb-28">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Item Tracker
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track refills and generate your calendar
          </p>
        </div>

        <div className="space-y-4">
          {items.map((itm, i) => {
            const collapsedView = collapsed[i] && isComplete(itm);
            const runOut = getRunOutDate(itm);

            return (
              <div
                key={i}
                className="bg-white p-4 rounded-2xl shadow-sm border transition-all"
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => toggleCollapse(i)}
                    className="text-left flex-1"
                  >
                    <div className="text-sm font-medium text-gray-700">
                      {itm.name || "Medication"}
                    </div>

                    {collapsedView && runOut && (
                      <div className="text-xs text-gray-500">
                        Runs out {runOut}
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm("Remove this item?")) {
                        removeItem(i);
                      }
                    }}
                    className="text-red-500 text-sm ml-2"
                  >
                    Remove
                  </button>
                </div>

                {/* Expanded */}
                {!collapsedView && (
                  <>
                    <input
                      className="w-full mb-3 p-3 border rounded-xl text-base"
                      placeholder="Item Name"
                      value={itm.name}
                      onChange={(e) => updateItem(i, "name", e.target.value)}
                      onBlur={() => handleBlur(i)}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Days"
                        className="p-3 border rounded-xl"
                        value={itm.days_supply}
                        onChange={(e) =>
                          updateItem(i, "days_supply", e.target.value)
                        }
                        onBlur={() => handleBlur(i)}
                      />

                      <input
                        type="text"
                        placeholder="MM-DD"
                        className="p-3 border rounded-xl"
                        value={itm.last_purchase}
                        onChange={(e) =>
                          updateItem(i, "last_purchase", e.target.value)
                        }
                        onBlur={(e) => {
                          handleDateBlur(i, e.target.value);
                          handleBlur(i);
                        }}
                      />
                    </div>

                    {/* Live preview */}
                    {runOut && (
                      <div className="text-sm text-green-600 mt-2">
                        Runs out: {runOut}
                      </div>
                    )}

                    <div className="relative mt-3">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full p-3 pl-7 border rounded-xl"
                        value={itm.cost}
                        onChange={(e) => updateItem(i, "cost", e.target.value)}
                        onBlur={() => handleBlur(i)}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={addItem}
          className="w-full mt-4 bg-white border border-dashed border-gray-300 text-gray-600 p-3 rounded-xl"
        >
          + Add Item
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <button
          onClick={generateICS}
          disabled={items.length === 0}
          className="w-full bg-green-600 text-white p-4 rounded-2xl font-medium disabled:opacity-50"
        >
          Generate Calendar
        </button>
      </div>
    </div>
  );
}

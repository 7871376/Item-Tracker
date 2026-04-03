import { useState } from "react";

export default function App() {
  const [items, setItems] = useState([]);

  const currentYear = new Date().getFullYear();

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { name: "", last_purchase: "", days_supply: "", cost: "" },
    ]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Auto-append current year if user enters MM-DD
  const handleDateBlur = (index, value) => {
    if (!value) return;

    // If user entered MM-DD format
    if (/^\d{1,2}-\d{1,2}$/.test(value)) {
      const [month, day] = value.split("-");
      const formatted = `${currentYear}-${month.padStart(
        2,
        "0"
      )}-${day.padStart(2, "0")}`;
      updateItem(index, "last_purchase", formatted);
    }
  };

  const generateICS = async () => {
    const payload = { medications: items };

    const prompt = `You are generating a calendar (.ics file).

INPUT DATA:
${JSON.stringify(payload, null, 2)}

REQUIREMENTS:
- Create individual events for each medication refill
- Refill date = last_purchase + days_supply
- Add alert 5 days before
- Include run-out date in title and description

- ALSO create weekly summary events:
  - Group by week (Monday start)
  - Include total cost
  - Include list of medications

OUTPUT:
Return ONLY valid .ics file content.`;

    console.log(prompt);
    alert("Send this prompt to ChatGPT API and download result");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-4">
        <h1 className="text-xl font-bold mb-4">Item Tracker</h1>

        {items.map((itm, i) => (
          <div key={i} className="mb-4 p-3 border rounded-xl">
            <input
              className="w-full mb-2 p-2 border rounded"
              placeholder="Item Name"
              maxLength={5}
              value={itm.name}
              onChange={(e) =>
                updateItem(i, "name", e.target.value.slice(0, 5))
              }
            />
            <span>&nbsp;&nbsp;&nbsp;</span>
            <input
              type="number"
              placeholder="Days Supply"
              className="w-full mb-2 p-2 border rounded"
              value={itm.days_supply}
              onChange={(e) => updateItem(i, "days_supply", e.target.value)}
            />
            <span>&nbsp;&nbsp;&nbsp;</span>
            <input
              type="text"
              placeholder="MM-DD or YYYY-MM-DD"
              className="w-full mb-2 p-2 border rounded"
              value={itm.last_purchase}
              onChange={(e) => updateItem(i, "last_purchase", e.target.value)}
              onBlur={(e) => handleDateBlur(i, e.target.value)}
            />
            <span>&nbsp;&nbsp;&nbsp;</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                $
              </span>

              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full p-2 pl-7 border rounded"
                value={itm.cost}
                onChange={(e) => updateItem(i, "cost", e.target.value)}
              />
            </div>
          </div>
        ))}
        <br />
        <button
          onClick={addItem}
          className="w-full mb-2 bg-blue-500 text-white p-2 rounded-xl"
        >
          Add Item
        </button>
        <span>&nbsp;&nbsp;&nbsp;</span>
        <button
          onClick={generateICS}
          className="w-full bg-green-500 text-white p-2 rounded-xl"
        >
          Generate Calendar
        </button>
      </div>
    </div>
  );
}

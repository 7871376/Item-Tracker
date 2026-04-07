import { useState, useRef, useEffect } from "react";
import { extractICS, downloadICS } from "./utils/ics";
import { getRunOutDate } from "./utils/date";
import { generateICSFromAPI } from "./api/openai";
import { testApiKey } from "./api/openai";

export default function App() {
  // add landing state
  // "landing" → "apiKey" → "form"
  const [screen, setScreen] = useState("landing");
  const [saveKey, setSaveKey] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem("apiKey") || "";
  });

  //add API key validation
  const [apiKeyError, setApiKeyError] = useState("");
  const validateApiKey = (key) => {
    if (!key) return ""; // allow user to skip
    if (!key.startsWith("sk-")) return "API key should start with 'sk-'";
    if (key.length < 20) return "API key looks too short";
    return "";
  };

  //add states for API key verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(null); // null | true | false

  const inputRefs = useRef([]);

  // 🔥 Load from localStorage on init
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("items");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("apiKey", apiKey);
    }
  }, [apiKey]);

  const [loading, setLoading] = useState(false);

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("collapsed");
    return saved ? JSON.parse(saved) : {};
  });

  const currentYear = new Date().getFullYear();

  // 🔥 Persist items
  useEffect(() => {
    localStorage.setItem("items", JSON.stringify(items));
  }, [items]);

  // 🔥 Persist collapsed state
  useEffect(() => {
    localStorage.setItem("collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const storedKey = localStorage.getItem("apiKey");
    if (storedKey) {
      setApiKey(storedKey);
      setScreen("form"); // skip API screen entirely
    }
  }, []);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { name: "", last_purchase: "", days_supply: "", cost: "" },
    ]);

    setTimeout(() => {
      const nextIndex = items.length;
      inputRefs.current[nextIndex]?.focus();
    }, 100);
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

  const handleBlur = (index) => {
    const item = items[index];

    if (isComplete(item)) {
      setCollapsed((prev) => ({ ...prev, [index]: true }));

      setTimeout(() => {
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) nextInput.focus();
      }, 120);
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

    const updated = {
      ...items[index],
      last_purchase: updatedValue,
    };

    if (isComplete(updated)) {
      setCollapsed((prev) => ({ ...prev, [index]: true }));
    }
  };

  const generateICS = async () => {
    let keyToUse = apiKey;

    if (!keyToUse) {
      const key = window.prompt("Enter your OpenAI API key:");
      if (!key) return;
      setApiKey(key);
      keyToUse = key;
    }

    setLoading(true);

    const payload = { medications: items };

    const promptText = `You are generating a calendar (.ics file).

INPUT DATA:
${JSON.stringify(payload, null, 2)}

REQUIREMENTS:
- For each medication, calculate ONLY the NEXT refill date
- Do NOT generate recurring or future refill cycles
- Only include one refill per medication

- Add alert 5 days before
- Include run-out date in title and description. Use the phrase "replace by " followed by the run-out date.
- Include projected cost in description after the run-out date. Use the phrase "Projected cost: $" followed by the cost.

OUTPUT:
Return ONLY valid .ics file content.`;

    try {
      const rawText = await generateICSFromAPI(keyToUse, promptText);

      if (!rawText) return;

      const icsContent = extractICS(rawText);

      downloadICS(icsContent);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {screen === "landing" && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Item Tracker</h1>
            <p className="text-gray-500 mb-6">
              Track items and add them to your calendar
            </p>

            <button
              onClick={() => setScreen("apiKey")}
              className="bg-green-600 text-white px-6 py-3 rounded-xl text-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {screen === "apiKey" && (
        <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
          <button
            onClick={() => setScreen("landing")}
            className="text-sm text-gray-500 mb-4 pl-4"
          >
            ← Back
          </button>
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 opacity-70">
              <img
                src="/OpenAI-black-monoblossom.png"
                alt="OpenAI"
                className="h-16 w-auto opacity-70"
              />
              <span className="text-sm text-gray-600">Uses OpenAI API</span>
            </div>
          </div>
          <div className="p-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Your API key is stored locally and never shared.
              </p>

              <h2 className="text-xl font-semibold mb-4">
                Enter OpenAI API Key
              </h2>
            </div>
            <div className="flex flex-col items-center">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  setApiKey(value);
                  setApiKeyError(validateApiKey(value));
                }}
                placeholder="sk-..."
                maxLength={100}
                className="w-200 border rounded p-2 mb-4"
              />

              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline mb-4"
              >
                Don’t have an API key? Get one!
              </a>

              <button
                onClick={async () => {
                  setIsVerifying(true);
                  setIsVerified(null);

                  const result = await testApiKey(apiKey);

                  setIsVerified(result);
                  setIsVerifying(false);
                }}
                className="bg-purple-500 text-white px-4 py-2 rounded mb-10 p-4"
              >
                {isVerifying ? "Verifying..." : "Verify API Key"}
                {isVerified === true && (
                  <p className="text-white-600 text-sm mb-2">
                    ✅ API key is valid
                  </p>
                )}

                {isVerified === false && (
                  <p className="text-white-500 text-sm mb-2">
                    ❌ API key is invalid
                  </p>
                )}
              </button>
            </div>{" "}
            {/*flex flex-col items-center*/}
            <div className="flex flex-col items-center justify-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={saveKey}
                  onChange={(e) => setSaveKey(e.target.checked)}
                />
                <span>Save key to this device</span>
              </label>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    if (saveKey && apiKey) {
                      localStorage.setItem("openai_api_key", apiKey);
                    } else {
                      localStorage.removeItem("apiKey");
                    }
                    setScreen("form");
                  }}
                  disabled={!!apiKeyError || (!!apiKey && !isVerified)}
                  className={`px-4 py-2 rounded text-white ${
                    apiKeyError
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500"
                  }`}
                  //className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Continue
                </button>

                <button
                  onClick={() => setScreen("form")}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>{" "}
          {/* p-4 */}
        </div>
      )}

      {apiKeyError && (
        <p className="text-red-500 text-sm mb-2">{apiKeyError}</p>
      )}

      {screen === "form" && (
        // 👉 YOUR EXISTING UI GOES HERE (unchanged)
        <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
          <button
            onClick={() => setScreen("apiKey")}
            className="text-sm text-gray-500 mb-4 pl-4"
          >
            ← Back
          </button>

          <div className="max-w-md mx-auto p-4 pb-28">
            <div className="mb-6">
              <h1 className="text-3xl font-semibold tracking-tight">
                Item Tracker
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Track items and generate your calendar
              </p>
            </div>

            <div className="space-y-4">
              {items.map((itm, i) => {
                const collapsedView = collapsed[i] && isComplete(itm);
                const runOut = getRunOutDate(itm);

                const urgencyColor = runOut
                  ? runOut.daysLeft <= 3
                    ? "text-red-600"
                    : runOut.daysLeft <= 7
                    ? "text-yellow-600"
                    : "text-green-600"
                  : "";

                return (
                  <div
                    key={i}
                    className="bg-white p-4 rounded-2xl shadow-sm border transition-all duration-200"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <button
                        onClick={() => toggleCollapse(i)}
                        className="text-left flex-1"
                      >
                        <div className="text-sm font-medium text-gray-700">
                          {itm.name || "Item Name"}
                        </div>

                        {collapsedView && runOut && (
                          <div className={`text-xs ${urgencyColor}`}>
                            Replace by {runOut.date} ({runOut.daysLeft} days)
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

                    {!collapsedView && (
                      <>
                        <input
                          ref={(el) => (inputRefs.current[i] = el)}
                          className="w-full mb-3 p-3 border rounded-xl text-base"
                          placeholder="Item Name"
                          value={itm.name}
                          onChange={(e) =>
                            updateItem(i, "name", e.target.value)
                          }
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

                        {runOut && (
                          <div className={`text-sm mt-2 ${urgencyColor}`}>
                            Replace by {runOut.date} ({runOut.daysLeft} days)
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
                            onChange={(e) =>
                              updateItem(i, "cost", e.target.value)
                            }
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
              title="Add an item to your list."
            >
              + Add Item
            </button>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
            <button
              onClick={generateICS}
              disabled={items.length === 0 || loading}
              className="w-full bg-green-600 text-white p-4 rounded-2xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              title="Generate your calendar file"
            >
              {loading && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? "Generating..." : "Generate Calendar"}
            </button>
          </div>
        </div>
      )}
    </>
  );
} //App()

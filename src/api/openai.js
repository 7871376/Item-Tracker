export async function generateICSFromAPI(apiKey, promptText) {
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

  const text = await response.text();
  const data = JSON.parse(text);

  return data.output?.[0]?.content?.[0]?.text || data.output_text;
}

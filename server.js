const express = require("express");
const cors = require("cors");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("❌ ERROR: API_KEY environment variable is required!");
  console.error("Set it with: export API_KEY=your_key_here");
  process.exit(1);
}

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

async function getAvailableModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    const data = await response.json();
    console.log(
      "Available models:",
      data.models.map((m) => m.name)
    );
    return data.models;
  } catch (error) {
    console.error("Error fetching models:", error);
    return [];
  }
}

app.post("/gemini", async (req, res) => {
  const userMessage = req.body.userMessage;
  const doctor = req.body.doctor || "General Practitioner";

  if (!userMessage) {
    return res.status(400).json({ error: "userMessage is required" });
  }

  try {
    console.log(
      "📨 Received request for",
      doctor + ":",
      userMessage.substring(0, 50) + "..."
    );

    const doctorContexts = {
      Cardiologist:
        "You are a cardiologist specializing in heart and cardiovascular system conditions.",
      Neurologist:
        "You are a neurologist expert in disorders of the nervous system and brain.",
      Dermatologist:
        "You are a dermatologist specialized in skin, hair, and nail conditions.",
      Pediatrician:
        "You are a pediatrician expert in children's health and development.",
      "General Practitioner":
        "You are a general practitioner handling general health concerns and preventive medicine.",
      Psychiatrist:
        "You are a psychiatrist specialized in mental health and emotional disorders.",
    };

    const context = doctorContexts[doctor] || "You are a medical professional.";

    const prompt = `${context} Please respond to this patient query: "${userMessage}". 
    Provide helpful medical information.
    in two three lines
    (disclaimer in one line )`;

    const modelEndpoints = [

      "gemini-2.0-flash", 

    ];

    let lastError = null;

    for (const model of modelEndpoints) {
      try {
        console.log(`Trying model: ${model}`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-goog-api-key": API_KEY,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("✅ API Response received from model:", model);

          // Extract the AI response text
          const answer =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "No answer generated";
          return res.json({ answer });
        } else {
          const errorData = await response.json();
          lastError = errorData;
          console.log(`❌ Model ${model} failed:`, response.status);
        }
      } catch (modelError) {
        console.log(`❌ Model ${model} error:`, modelError.message);
        lastError = modelError;
      }
    }

    console.error("❌ All models failed");
    return res.status(500).json({
      error: "All model attempts failed",
      details: lastError,
    });
  } catch (err) {
    console.error("🚨 Error:", err.message);
    res.status(500).json({
      error: "Error connecting to AI service",
      message: err.message,
    });
  }
});

app.get("/models", async (req, res) => {
  try {
    const models = await getAvailableModels();
    res.json({ models: models.map((m) => m.name) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Model list: http://localhost:${PORT}/models`);

  // Log available models on startup
  getAvailableModels().then((models) => {
    if (models.length > 0) {
      console.log("📋 Available models:", models.map((m) => m.name).join(", "));
    }
  });
});

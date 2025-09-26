// DOM Elements
const homeSection = document.getElementById("home");
const chatRoomSection = document.getElementById("chatRoom");
const chatDoctorElement = document.getElementById("chatDoctor");
const chatMessagesElement = document.getElementById("chatMessages");
const userInputElement = document.getElementById("userInput");
const typingIndicator = document.getElementById("typingIndicator");
const themeToggle = document.getElementById("themeToggle");

let currentDoctor = "";
let chatHistory = {};
const API_BASE_URL = "http://localhost:3000"; 

document.getElementById("initial-time").textContent = getCurrentTime();

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const icon = themeToggle.querySelector("i");
  if (document.body.classList.contains("dark-mode")) {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
    localStorage.setItem("theme", "dark");
  } else {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
    localStorage.setItem("theme", "light");
  }
});

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
  const icon = themeToggle.querySelector("i");
  icon.classList.remove("fa-moon");
  icon.classList.add("fa-sun");
}

function getCurrentTime() {
  const now = new Date();
  return (
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0")
  );
}

function openChat(doctor) {
  currentDoctor = doctor;
  homeSection.style.display = "none";
  chatRoomSection.style.display = "flex";
  chatDoctorElement.textContent = `Chat with ${doctor}`;

  if (chatHistory[doctor]) {
    chatMessagesElement.innerHTML = chatHistory[doctor];
  } else {
    chatMessagesElement.innerHTML = `
            <div class="bot-message message">
              Hello! I'm Dr. ${doctor}, your virtual medical assistant. 
              How can I help you with your health concerns today?
              <div class="message-time">${getCurrentTime()}</div>
            </div>
          `;
  }

  setTimeout(() => {
    userInputElement.focus();
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
  }, 100);
}

function goBack() {
  if (currentDoctor) {
    chatHistory[currentDoctor] = chatMessagesElement.innerHTML;
  }

  chatRoomSection.style.display = "none";
  homeSection.style.display = "block";
  currentDoctor = "";
}

function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}

async function sendMessage() {
  const message = userInputElement.value.trim();
  if (!message || !currentDoctor) return;

  addMessage(message, "user");
  userInputElement.value = "";

  typingIndicator.style.display = "block";
  chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;

  try {
    const reply = await fetchGeminiResponse(message, currentDoctor);

    typingIndicator.style.display = "none";
    addMessage(reply, "bot");
  } catch (error) {
    typingIndicator.style.display = "none";
    addMessage(
      "Sorry, I'm experiencing technical difficulties. Please try again shortly.(Server Issue)",
      "bot"
    );
    console.error("Error:", error);
  }
}

function addMessage(text, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", `${sender}-message`);
  messageDiv.innerHTML = `
          ${text}
          <div class="message-time">${getCurrentTime()}</div>
        `;
  chatMessagesElement.appendChild(messageDiv);

  chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;

  if (currentDoctor) {
    chatHistory[currentDoctor] = chatMessagesElement.innerHTML;
  }
}

async function fetchGeminiResponse(message, doctor) {
  try {
    const response = await fetch(`${API_BASE_URL}/gemini`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userMessage: message,
        doctor: doctor,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.answer;
  } catch (error) {
    console.error("Error fetching response:", error);
    throw error;
  }
}

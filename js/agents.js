// ─── CHAT AGENT WITH OLLAMA ─────────────────────────────────────────────
const ChatAgent = {
  async askOllama(prompt) {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "phi3",
        prompt: prompt,
        stream: false
      })
    });

    const data = await res.json();
    return data.response;
  },

  async extractProfile(userInput) {
    const prompt = `
You are an AI that extracts structured user data.

Extract:
- age
- state
- occupation
- income
- category (SC/ST/OBC/General)

Return ONLY JSON.

Input: ${userInput}
`;

    const res = await this.askOllama(prompt);

    try {
      return JSON.parse(res);
    } catch {
      return null;
    }
  },

  async handle(userInput) {
    // Step 1: Extract profile
    const profile = await this.extractProfile(userInput);

    // Step 2: If extraction fails → ask question
    if (!profile) {
      return "Can you tell me your age, state, and income?";
    }

    // Step 3: Save profile
    ProfileAgent.save(profile);

    // Step 4: Get schemes (🔥 YOUR EXISTING SYSTEM)
    const schemes = SchemeRetrievalAgent.search(userInput);

    if (!schemes || schemes.length === 0) {
      return "I couldn't find matching schemes. Try giving more details.";
    }

    // Step 5: Format result
    let response = "Here are some schemes for you:\n\n";

    schemes.slice(0, 5).forEach((s, i) => {
      response += `${i + 1}. ${s.name}\n`;
    });

    return response;
  }
};

window.Agents = window.Agents || {};
window.Agents.ChatAgent = ChatAgent;
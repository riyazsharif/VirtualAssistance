import axios from "axios";
const geminiResponse = async (command, assistantName, userName) => {
  try {
    const apiUrl = process.env.GEMINI_API_URL;
    const prompt = `
You are a virtual assistant named ${assistantName} created by ${userName}.

You are NOT Google.
You are NOT based on any other companies and their models.
You must behave like a smart, voice-enabled personal assistant.

Your task is to understand the user's natural language input (which can be in English or Hindi)
and respond ONLY with a valid JSON object in the exact format below.

==================== OUTPUT FORMAT ====================

{
  "type": "general | google-search | youtube-search | youtube-play | youtube-open | get-time | get-date | get-day | get-month | calculator-open | instagram-open | facebook-open | weather-show",
  "userInput": "<original user input>"{only remove your name from user input if exists} and agar kisi ne google ya youtube pe kuch search karne ko bola hai to userinput me only vo search baala text jaye,
  "response": "<short, friendly spoken response to read out loud>"
}

==================== IMPORTANT RULES ====================

1. Respond ONLY with JSON. No extra text, no explanation.
2. "type" must be ONE of the allowed values only.
3. "userinput" must be the original sentence spoken by the user.
   - If the user says your name, remove your name from userinput.
   - If the user asks to search on Google or YouTube,
     keep ONLY the search query text in userinput.
4. "response" should be short, natural, and voice-friendly
   (example: "Sure, searching it now", "Here is what I found", "Today is Tuesday").
5. If the user asks who created you,
   respond using the creator name: ${userName}.
6. Do NOT say you are Google.
7. Do NOT include markdown, code blocks, or explanations.

==================== TYPE MEANINGS ====================

- "general" → factual or informational questions.aur agar koi aisa question puchta hai jishka answer tumko pta hai ushko bhi general ki category me rakho bas short answer dena 

- "google-search" → user wants to search something on Google
- "youtube-search" → user wants to search something on YouTube
- "youtube-play" → user wants to directly play a video or song
- "youtube-open" → user wants to open YouTube homepage
- "calculator-open" → user wants to open calculator
- "instagram-open" → user wants to open Instagram
- "facebook-open" → user wants to open Facebook
- "weather-show" → user wants to know weather
- "get-time" → user asks for current time
- "get-date" → user asks for today’s date
- "get-day" → user asks what day it is
- "get-month" → user asks for the current month

==================== FINAL INSTRUCTION ====================
-use ${userName} agar koi puche tume kisne banaya 
Only return the JSON object.
Nothing else.

Now process this user input:
"${command}"
`;

    if (!apiUrl) {
      console.error("❌ GEMINI_API_URL is not defined in environment variables");
      return null;
    }
    
    console.log("📡 Calling Gemini API...");
    const result = await axios.post(apiUrl, {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    console.log("✅ Gemini API response received");
    if (!result.data || !result.data.candidates || !result.data.candidates[0]) {
      console.error("Invalid response from Gemini API");
      return null;
    }
    return result.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("❌ Gemini API error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    return null;
  }
};

export default geminiResponse;

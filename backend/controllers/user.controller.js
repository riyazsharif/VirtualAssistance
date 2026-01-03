import User from "../models/user.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import geminiResponse from "../gemini.js";
import { json, response } from "express";
import moment from "moment";

// Fallback command parser when Gemini API fails
const parseCommandFallback = (command, assistantName, userName) => {
  const cmd = command.toLowerCase().trim();
  const assistantNameLower = assistantName.toLowerCase();
  
  // Remove assistant name from command
  let cleanCmd = cmd.replace(new RegExp(assistantNameLower, 'gi'), '').trim();
  
  // Handle "who made you" / "kisne banaya" questions
  if (cleanCmd.includes('kisne banaya') || cleanCmd.includes('who made you') || 
      cleanCmd.includes('who created you') || cleanCmd.includes('tumhen kisne banaya') ||
      cleanCmd.includes('who built you') || cleanCmd.includes('kaun banaya')) {
    return JSON.stringify({
      type: "general",
      userInput: command,
      response: `${userName || "User"} created me.`
    });
  }
  
  // YouTube commands
  if (cleanCmd.includes('youtube') || cleanCmd.includes('open youtube')) {
    if (cleanCmd.includes('search') || cleanCmd.includes('play')) {
      const searchQuery = cleanCmd.replace(/youtube|search|play|open/gi, '').trim();
      return JSON.stringify({
        type: searchQuery ? "youtube-search" : "youtube-open",
        userInput: searchQuery || "youtube",
        response: searchQuery ? `Searching ${searchQuery} on YouTube` : "Opening YouTube"
      });
    }
    return JSON.stringify({
      type: "youtube-open",
      userInput: "youtube",
      response: "Opening YouTube"
    });
  }
  
  // Facebook
  if (cleanCmd.includes('facebook') || cleanCmd.includes('open facebook')) {
    return JSON.stringify({
      type: "facebook-open",
      userInput: "facebook",
      response: "Opening Facebook"
    });
  }
  
  // Instagram
  if (cleanCmd.includes('instagram') || cleanCmd.includes('open instagram')) {
    return JSON.stringify({
      type: "instagram-open",
      userInput: "instagram",
      response: "Opening Instagram"
    });
  }
  
  // Google search
  if (cleanCmd.includes('google') || cleanCmd.includes('search')) {
    const searchQuery = cleanCmd.replace(/google|search/gi, '').trim();
    return JSON.stringify({
      type: "google-search",
      userInput: searchQuery || "search",
      response: `Searching ${searchQuery || 'on Google'}`
    });
  }
  
  // Calculator
  if (cleanCmd.includes('calculator') || cleanCmd.includes('calc')) {
    return JSON.stringify({
      type: "calculator-open",
      userInput: "calculator",
      response: "Opening calculator"
    });
  }
  
  // Weather
  if (cleanCmd.includes('weather')) {
    return JSON.stringify({
      type: "weather-show",
      userInput: "weather",
      response: "Showing weather information"
    });
  }
  
  // Time
  if (cleanCmd.includes('time') || cleanCmd.includes('what time')) {
    return JSON.stringify({
      type: "get-time",
      userInput: "time",
      response: `Current time is ${moment().format("hh:mm A")}`
    });
  }
  
  // Date
  if (cleanCmd.includes('date') || cleanCmd.includes('what date')) {
    return JSON.stringify({
      type: "get-date",
      userInput: "date",
      response: `Today's date is ${moment().format("YYYY-MM-DD")}`
    });
  }
  
  return null;
};
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(400).json({ message: "user not found " });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(400).json({ message: "get current user error  " });
  }
};

export const updateAssistant = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const { assistantName, imageUrl } = req.body;
    let assistantImage;
    
    if (req.file) {
      try {
        assistantImage = await uploadOnCloudinary(req.file.path);
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ message: "Failed to upload image" });
      }
    } else {
      assistantImage = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { assistantName, assistantImage },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json(user);
  } catch (error) {
    console.error("updateAssistant error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      message: "updateAssistant error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ response: "command is required" });
    }
    
    if (!req.userId) {
      return res.status(401).json({ response: "User not authenticated" });
    }
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ response: "user not found" });
    }
    const userName = user.name || "User";
    let assistantName = user.assistantName;
    
    // If assistant name is not set, use default
    if (!assistantName || assistantName.trim() === "") {
      assistantName = "Assistant";
    }
    
    console.log("Processing command:", command);
    console.log("Assistant name:", assistantName);
    console.log("User name:", userName);
    
    // Try Gemini API first
    let result = null;
    try {
      result = await geminiResponse(command, assistantName, userName);
      console.log("Gemini response received:", result ? "Yes" : "No");
    } catch (geminiError) {
      console.error("Gemini API error:", geminiError.message);
      result = null; // Will use fallback
    }
    
    // Fallback to basic command parsing if Gemini fails
    let gemResult;
    if (!result) {
      console.log("⚠️ Gemini API failed, using fallback command parsing");
      const fallbackResult = parseCommandFallback(command, assistantName, userName);
      if (fallbackResult) {
        try {
          gemResult = JSON.parse(fallbackResult);
          console.log("✅ Fallback parsing successful:", gemResult);
        } catch (parseError) {
          console.error("Fallback parse error:", parseError);
          return res.status(500).json({ response: "failed to parse fallback response" });
        }
      } else {
        console.error("Both Gemini API and fallback parsing failed");
        return res.status(500).json({ response: "failed to get response from assistant" });
      }
    } else {
      // Parse Gemini response
      const jsonMatch = result.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        console.log("⚠️ No JSON found in Gemini response, trying fallback");
        const fallbackResult = parseCommandFallback(command, assistantName, userName);
        if (fallbackResult) {
          try {
            gemResult = JSON.parse(fallbackResult);
          } catch (parseError) {
            return res.status(400).json({ response: "sorry, i can't understand" });
          }
        } else {
          return res.status(400).json({ response: "sorry, i can't understand" });
        }
      } else {
        try {
          gemResult = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          console.error("Failed to parse:", jsonMatch[0]);
          // Try fallback on parse error
          const fallbackResult = parseCommandFallback(command, assistantName, userName);
          if (fallbackResult) {
            try {
              gemResult = JSON.parse(fallbackResult);
            } catch (fallbackParseError) {
              return res.status(500).json({ response: "failed to parse response" });
            }
          } else {
            return res.status(500).json({ response: "failed to parse response" });
          }
        }
      }
    }
    
    if (!gemResult || !gemResult.type) {
      console.error("Invalid gemResult:", gemResult);
      return res.status(500).json({ response: "invalid response format" });
    }
    
    console.log("Final gemResult:", gemResult);
    const type = gemResult.type;

    switch (type) {
      case "get-date":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `Today's date is ${moment().format("YYYY-MM-DD")}`,
        });
      case "get-time":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `Current time is ${moment().format("hh:mm A")}`,
        });

      case "get-day":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `Today is ${moment().format("dddd")}`,
        });
      case "get-month":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `Current month is ${moment().format("MMMM")}`,
        });
      case "google-search":
      case "youtube-search":
      case "youtube-play":
      case "youtube-open":
      case "general":
      case "calculator-open":
      case "instagram-open":
      case "facebook-open":
      case "weather-show":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: gemResult.response,
        });
      default:
        return res
          .status(400)
          .json({ response: "i did't understsnd that command." });
    }
  } catch (error) {
    console.error("askToAssistant error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      response: "ask assistant error.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

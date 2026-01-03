import React, { useRef, useContext, useEffect, useState } from "react";
import { UserDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import aiImg from "../assets/ai.gif"
import userImg from "../assets/user.gif"


function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(UserDataContext);
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const handleLogout = async () => {
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      setUserData(null);
      navigate("/signin");
    } catch (error) {
      setUserData(null);
      console.log(error);
    }
  };
  const speak = (text) => {
    if (!text) return;
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find((voice) => voice.lang.startsWith("hi"));
    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  
  const openUrl = (url) => {
    console.log("🔗 Opening URL:", url);
    
    // Use simple link.click() method which is most reliable
    try {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.position = "fixed";
      link.style.top = "0";
      link.style.left = "0";
      link.style.width = "1px";
      link.style.height = "1px";
      link.style.opacity = "0";
      link.style.pointerEvents = "none";
      
      document.body.appendChild(link);
      
      // Use native click which is more reliable than MouseEvent
      link.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        try {
          if (link.parentNode) {
            document.body.removeChild(link);
          }
        } catch (cleanupError) {
          console.log("Cleanup error (ignored):", cleanupError);
        }
      }, 200);
      
      console.log("✅ URL opening attempted via link click");
    } catch (error) {
      console.error("Error opening URL:", error);
      // Fallback to window.open
      try {
        const newWindow = window.open(url, "_blank", "noopener,noreferrer");
        if (newWindow) {
          console.log("✅ URL opened via window.open");
        } else {
          console.log("⚠️ Popup blocked, user needs to allow popups");
        }
      } catch (err) {
        console.error("Failed to open URL:", err);
      }
    }
  };

  useEffect(() => {
    if (!userData?.assistantName) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported");
      return;
    }

    // Check microphone permission
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then((result) => {
        if (result.state === 'denied') {
          setMicPermissionDenied(true);
          setAiText("Microphone permission denied. Please allow microphone access in browser settings.");
          return;
        } else {
          setMicPermissionDenied(false);
        }
      }).catch(() => {
        // Permission API not supported, continue anyway
      });
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognitionRef.current = recognition;

    // Handle command execution
    const handleCommand = (data) => {
      if (!data || !data.type) {
        console.error("Invalid command data:", data);
        return;
      }

      const { type, userInput, response } = data;
      const commandType = type?.trim().toLowerCase();
      console.log("COMMAND TYPE:", commandType);

      // Handle different command types - use setTimeout to ensure URL opens
      switch (commandType) {
        case "instagram-open":
          setTimeout(() => openUrl("https://www.instagram.com"), 100);
          break;

        case "facebook-open":
          setTimeout(() => openUrl("https://www.facebook.com"), 100);
          break;

        case "youtube-open":
          setTimeout(() => openUrl("https://www.youtube.com"), 100);
          break;

        case "youtube-search":
        case "youtube-play": {
          const query = encodeURIComponent(userInput || "");
          setTimeout(() => openUrl(`https://www.youtube.com/results?search_query=${query}`), 100);
          break;
        }

        case "google-search": {
          const query = encodeURIComponent(userInput || "");
          setTimeout(() => openUrl(`https://www.google.com/search?q=${query}`), 100);
          break;
        }

        case "calculator-open":
          setTimeout(() => openUrl("https://www.google.com/search?q=calculator"), 100);
          break;

        case "weather-show":
          setTimeout(() => openUrl("https://www.google.com/search?q=weather"), 100);
          break;

        case "get-time":
        case "get-date":
        case "get-day":
        case "get-month":
        case "general":
          // For general responses (like "who made you"), just speak the response
          if (response) {
            speak(response);
          }
          break;

        default:
          console.log("❌ no matching command:", commandType);
          if (response) {
            speak(response);
          }
          break;
      }

      // Speak the response after opening the window (for action commands)
      if (response && commandType !== "general" && commandType !== "get-time" && 
          commandType !== "get-date" && commandType !== "get-day" && commandType !== "get-month") {
        setTimeout(() => {
          speak(response);
        }, 200);
      }
    };

    let isRestarting = false;

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      console.log("heard:", transcript);

      if (transcript.toLowerCase().includes(userData.assistantName.toLowerCase())) {
        // Show user speaking state
        setUserText(transcript);
        setAiText("");
        
        try {
          const data = await getGeminiResponse(transcript);
          console.log("Response from backend:", data);
          
          if (data && data.error) {
            // Handle error response
            const errorMsg = data.response || "Sorry, there was an error processing your request.";
            setAiText(errorMsg);
            speak(errorMsg);
          } else if (data && data.type && data.type !== "error") {
            // Handle successful command - show AI response
            if (data.response) {
              setAiText(data.response);
            }
            handleCommand(data);
          } else {
            const errorMsg = "Sorry, I couldn't understand that.";
            setAiText(errorMsg);
            speak(errorMsg);
          }
        } catch (error) {
          console.error("Error getting response:", error);
          const errorMsg = "Sorry, there was an error processing your request.";
          setAiText(errorMsg);
          speak(errorMsg);
        }
      }
    };

    recognition.onerror = (e) => {
      console.error("Recognition error:", e.error);
      
      // Don't restart on permission errors or unrecoverable errors
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        console.error("❌ Microphone permission denied. Please allow microphone access in browser settings.");
        setMicPermissionDenied(true);
        setAiText("Microphone permission denied. Please allow microphone access in browser settings and refresh the page.");
        // Stop trying to restart
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (stopErr) {
            console.log("Error stopping recognition:", stopErr);
          }
        }
        return;
      }
      
      // Don't restart on network errors that won't recover
      if (e.error === "network" || e.error === "service-not-allowed") {
        console.error("❌ Network or service error:", e.error);
        setAiText("Speech recognition service unavailable. Please check your connection.");
        return;
      }
      
      // Restart recognition on recoverable errors (not for normal "no-speech" or "aborted")
      if (e.error !== "no-speech" && e.error !== "aborted" && !isRestarting) {
        isRestarting = true;
        setTimeout(() => {
          try {
            if (recognitionRef.current) {
              recognitionRef.current.start();
              console.log("✅ Recognition restarted after error:", e.error);
            }
          } catch (err) {
            console.log("Recognition restart after error:", err.message);
            // Retry after delay only if it's a recoverable error
            if (err.message && !err.message.includes("already")) {
              setTimeout(() => {
                try {
                  if (recognitionRef.current) {
                    recognitionRef.current.start();
                  }
                } catch (retryErr) {
                  console.log("Recognition restart retry after error:", retryErr.message);
                } finally {
                  isRestarting = false;
                }
              }, 2000);
            } else {
              isRestarting = false;
            }
          } finally {
            // Reset flag after a delay to allow future restarts
            setTimeout(() => {
              isRestarting = false;
            }, 2000);
          }
        }, 2000);
      } else if ((e.error === "no-speech" || e.error === "aborted") && !isRestarting) {
        // For "no-speech" and "aborted", restart but with a delay
        isRestarting = true;
        setTimeout(() => {
          try {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          } catch (err) {
            console.log("Recognition restart after no-speech/aborted:", err.message);
          } finally {
            isRestarting = false;
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Don't restart if permission is denied
      if (micPermissionDenied) {
        console.log("⚠️ Recognition stopped: Microphone permission denied");
        return;
      }
      
      // Always restart recognition when it ends to keep microphone active
      if (userData?.assistantName && !isRestarting) {
        isRestarting = true;
        setTimeout(() => {
          try {
            if (recognitionRef.current && !micPermissionDenied) {
              recognitionRef.current.start();
              console.log("✅ Recognition restarted");
            }
          } catch (err) {
            // Recognition might already be starting, which is fine
            console.log("Recognition restart:", err.message);
            if (err.message && err.message.includes("not-allowed")) {
              setMicPermissionDenied(true);
              setAiText("Microphone permission denied. Please allow microphone access.");
            } else {
              // Try again after a short delay only if it's not a permission error
              setTimeout(() => {
                try {
                  if (recognitionRef.current && !micPermissionDenied) {
                    recognitionRef.current.start();
                  }
                } catch (retryErr) {
                  console.log("Recognition restart retry:", retryErr.message);
                  if (retryErr.message && retryErr.message.includes("not-allowed")) {
                    setMicPermissionDenied(true);
                  }
                } finally {
                  isRestarting = false;
                }
              }, 500);
            }
          } finally {
            if (!micPermissionDenied) {
              setTimeout(() => {
                isRestarting = false;
              }, 500);
            } else {
              isRestarting = false;
            }
          }
        }, 100);
      }
    };

    try {
      if (!micPermissionDenied) {
        recognition.start();
        console.log("🎤 Recognition started");
      }
    } catch (err) {
      console.error("Failed to start recognition:", err);
      if (err.message && err.message.includes("not-allowed")) {
        setMicPermissionDenied(true);
        setAiText("Microphone permission denied. Please allow microphone access.");
      }
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error("Error stopping recognition:", err);
        }
      }
      window.speechSynthesis.cancel();
    };
  }, [userData?.assistantName, getGeminiResponse]);

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center  flex-col gap-[15px]">
      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white absolute top-[20px] right-[20px] cursor-pointer rounded-full text-[19px]"
        onClick={handleLogout}
      >
        Log Out
      </button>

      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white absolute top-[100px] right-[20px] cursor-pointer rounded-full text-[19px] px-[20px] py-[10px]"
        onClick={() => navigate("/customize")}
      >
        Customize your Assistant
      </button>

      <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg">
        <img
          src={userData?.assistantImage}
          alt=""
          className="h-full object-cover"
        />
      </div>
      <h1 className="text-white text-[18px] font-semibold ">
        I'm {userData?.assistantName || "Assistant"}
      </h1>
      {!aiText && <img src={userImg} alt="User speaking" className="w-[200px]" />}
      {aiText && <img src={aiImg} alt="AI responding" className="w-[200px]" />}
    </div>
  );
}

export default Home;

import React, { createContext, useEffect, useState } from "react";
import axios from "axios";

export const UserDataContext = createContext();

function UserProvider({ children }) {
  const serverUrl = "https://virtualassistance-backend-i3ol.onrender.com";
  const [userData, setUserData] = useState(null);
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  useEffect(() => {
    const getUser = async () => {
      try {
        const result = await axios.get(`${serverUrl}/api/user/current`, {
          withCredentials: true,
        });
        setUserData(result.data);
      } catch (error) {
        setUserData(null);
      }
    };
    getUser();
  }, []);
  const logout = async () => {
    try {
      await axios.post(
        `${serverUrl}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      setUserData(null);
    } catch (error) {
      console.log(error);
    }
  };
  const getGeminiResponse = async (command) => {
    try {
      const result = await axios.post(
        `${serverUrl}/api/user/asktoassistant`,
        { command },
        { withCredentials: true }
      );
      return result.data;
    } catch (error) {
      console.error("Error getting Gemini response:", error);
      // Return error response to allow frontend to handle it
      if (error.response) {
        // Server responded with error status
        return {
          error: true,
          response: error.response.data?.response || "Error processing your request",
          type: "error"
        };
      } else if (error.request) {
        // Request made but no response (network error)
        return {
          error: true,
          response: "Unable to connect to server. Please check if the server is running.",
          type: "error"
        };
      } else {
        // Error setting up request
        return {
          error: true,
          response: "An error occurred. Please try again.",
          type: "error"
        };
      }
    }
  };

  const value = {
    serverUrl,
    userData,
    setUserData,
    backendImage,
    setBackendImage,
    frontendImage,
    setFrontendImage,
    selectedImage,
    setSelectedImage,
    logout,
    getGeminiResponse,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

export default UserProvider;
export { UserProvider };

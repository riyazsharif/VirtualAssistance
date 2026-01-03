import mongoose from "mongoose";

const connectDb = async () => {
    try {
        if (!process.env.MONGODB_URL) {
            console.error("⚠️  MONGODB_URL is not defined in environment variables");
            console.log("⚠️  Server will start but database operations will fail");
            return;
        }
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ db connected!");
    } catch (error) {
        console.error("❌ Database connection error:", error.message);
        console.log("⚠️  Server will continue but database operations will fail");
        // Don't exit - let server start even if DB fails
    }  
};
export default connectDb;
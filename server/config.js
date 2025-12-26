
import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const mongoURL = process.env.MONGO_URL;


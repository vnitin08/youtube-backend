import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

// _ is used to ignore the second parameter in the middleware function
export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ", "");
        
        if (!token) {
            throw new apiError(401, "Unauthorized");
        } 
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if (!user) {
            throw new apiError(401, "Invalid Access token");
        }
    
        req.user = user;
        next();

    } catch (error) {
        throw new apiError(401, error?.message || "Invalid Access token");   
    }
});
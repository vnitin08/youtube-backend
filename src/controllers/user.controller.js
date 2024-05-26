import { asyncHandler } from '../utils/asyncHandler.js'
import { apiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { apiResponse } from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshToken = async (userId) => {
    try  {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new apiError(500, "Error while generating tokens")
    }

}

const registerUser = asyncHandler(async (req, res) => {
    // Register user logic here
    // step 1: get user data from req.body
    // step 2: validate user data
    // step 3: check if user already exists: username, email
    // step 4: check for image , avatar
    // step 5: upload them to cloudinary, avatar
    // step 6: create user object - create entry in db
    // step 7: remove password and refresh token field from response
    // step 8: check for user creation
    // step 9: send response

    const {fullName, email, username, password} = req.body
    // console.log("email: ", email)

    if(fullName === "" || email === "" || username === "" || password === ""){
        throw new apiError(400, "All fields are required")
    }

    await User.findOne({
        $or: [{email}, {username}]
    }).then(user => {
        if(user){
            throw new apiError(409, "User already exists")
        }
    })

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    if(!avatar){
        throw new apiError(500, "Error uploading avatar")
    }

    const user = await User.create({
        fullName,
        avatar,
        coverImage: coverImage || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new apiError(500, "Error creating user")
    }

    return res.status(201).json(new apiResponse(createdUser, 201, "User created successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
    // Login user logic here
    // step 1: get user data from req.body
    // step 2: validate user data
    // step 3: check if user exists: username, email
    // step 4: check if password is correct
    // step 5: generate access and refresh token
    // step 6: send cookies with tokens

    const {email, username, password} = req.body
    console.log("username: ", username)
    if(!email && !username){
        throw new apiError(400, "Email or username is required")
    }
 
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new apiError(404, "User not found")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if(!isPasswordCorrect){
        throw new apiError(401, "Invalid credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new apiResponse({user: loggedInUser, accessToken, refreshToken}, 200, "User Logged In successful"))
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {$set:{refreshToken: undefined}}, {new: true})

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse({}, 200, "User logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new apiError(401, "Invalid refresh token")
        }
    
        if(user?.refreshToken !== incomingRefreshToken){
            throw new apiError(401, "Refresh token is expired or invalid")
        }
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new apiResponse({accessToken, newRefreshToken}, 200, "Access token refreshed successfully"))
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
    }
})

export { registerUser, loginUser, logoutUser, refreshAccessToken}
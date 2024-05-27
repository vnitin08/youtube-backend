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

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {currentPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword)

    if(!isPasswordCorrect){
        throw new apiError(401, "Invalid current password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new apiResponse({}, 200, "Password changed successfully"))
}) 

const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select("-password -refreshToken")

    return res.status(200).json(new apiResponse(user, 200, "User profile fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new apiError(400, "All fields are required")
    }

    // new: true - return the updated document
    const user = await User.findByIdAndUpdate(req.user?._id, {fullName, email}, {new: true}).select("-password ")
    
    return res.status(200).json(new apiResponse(user, 200, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path // single file
    if(!avatarLocalPath){
        throw new apiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar){
        throw new apiError(500, "Error while uploading avatar on cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {avatar}, {new: true}).select("-password")

    return res.status(200).json(new apiResponse(user, 200, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path // single file
    if(!coverImageLocalPath){
        throw new apiError(400, "Cover image file is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage){
        throw new apiError(500, "Error while uploading cover image on cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {coverImage}, {new: true}).select("-password")

    return res.status(200).json(new apiResponse(user, 200, "Cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params // params is an object containing all the route parameters (channelId) in this case  

    if(!username?.trim()){
        throw new apiError(400, "Username is required")
    }

    const channel = await User.aggregate([
        {
            $match: {username: username?.toLowerCase()} // $match: {field: value} - filters the documents
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {$size: "$subscribers"},
                channelsSubscribedToCount: {$size: "$subscribedTo"}
            },
            isSubscribed: {
                $cond: {
                    if: {
                        $in: [req.user?._id, "$subscribers.subscriber"] // $in: [value, array] - returns true if value is present in array
                    },
                    then: true,
                    else: false
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                coverImage: 1,
                avatar: 1,
                email: 1
            }
        }
    ])
    console.log("channel: ", channel)

    if(!channel?.length){
        throw new apiError(404, "Channel not found")
    }

    return res.status(200)
    .json(new apiResponse(channel[0], 200, "Channel profile fetched successfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)  // new mongoose.Types.ObjectId(id) - converts string id to ObjectId    
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(new apiResponse(user[0]?.watchHistory, 200, "Watch history fetched successfully"))
})


export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getUserProfile, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}
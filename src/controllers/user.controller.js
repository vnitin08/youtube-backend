import { asyncHandler } from '../utils/asyncHandler.js'
import { apiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { apiResponse } from '../utils/apiResponse.js'

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
    console.log("email: ", email)

    if(fullName === "" || email === "" || username === "" || password === ""){
        throw new apiError(400, "All fields are required")
    }

    User.findOne({
        $or: [{email}, {username}]
    }).then(user => {
        if(user){
            throw new apiError(409, "User already exists")
        }
    })

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

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

export { registerUser }
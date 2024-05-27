import express from 'express';
import { changeCurrentPassword, getUserChannelProfile, getUserProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', upload.fields([{name: "avatar", maxCount: 1},{name: "coverImage", maxCount: 1}]), registerUser);

router.post(('/login'), loginUser);

// secured routes
router.post('/logout', verifyJWT, logoutUser);
router.post('/refresh-token', refreshAccessToken);
router.post('/change-password', verifyJWT, changeCurrentPassword);
router.get('/profile', verifyJWT, getUserProfile);
router.patch('/update-profile', verifyJWT, updateAccountDetails);

router.patch('/update-avatar', verifyJWT, upload.single('avatar'), updateUserAvatar);
router.patch('/update-cover-image', verifyJWT, upload.single('coverImage'), updateUserAvatar);

router.get('/c/:username', verifyJWT, getUserChannelProfile);
router.get('/history', verifyJWT, getWatchHistory);

export default router;